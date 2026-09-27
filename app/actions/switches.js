"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../lib/supabase/server-client";


export async function createSwitch(payload) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new Error("Unauthorized. Please log in to create a switch.");
  }

  // 1. Sanitize 4-unit interval
  const sanitizedInterval = {
    months: Number(payload.check_in_interval?.months || 0),
    days: Number(payload.check_in_interval?.days || 0),
    hours: Number(payload.check_in_interval?.hours || 0),
    minutes: Number(payload.check_in_interval?.minutes || 0),
  };

  // Validate interval > 0
  const totalMinutes =
    sanitizedInterval.months * 43200 +
    sanitizedInterval.days * 1440 +
    sanitizedInterval.hours * 60 +
    sanitizedInterval.minutes;

  if (totalMinutes <= 0) {
    throw new Error("Interval duration must be greater than zero minutes.");
  }

  // 2. Preserve module flags AND module configurations
  const sanitizedActions = {
    email: payload.actions?.email ?? true,
    modules: {
      beacon: payload.actions?.modules?.beacon ?? true,
      data_release: payload.actions?.modules?.data_release ?? false,
      purge: payload.actions?.modules?.purge ?? false,
      lockdown: payload.actions?.modules?.lockdown ?? false,
      ...payload.actions?.modules,
    },
    // Preserve sub-module configs from CreateSwitchForm
    data_releases: payload.actions?.data_releases || [],
    purge_config: payload.actions?.purge_config || null,
    lockdown_config: payload.actions?.lockdown_config || null,
  };

  // 3. Insert parent switch record
  const { data: newSwitch, error: switchErr } = await supabase
    .from("switches")
    .insert({
      usr_id: user.id,
      name: payload.name?.trim() || "Untitled Sentinel",
      criticality: payload.criticality || "OPERATIONAL",
      purpose: payload.purpose?.trim() || "PERSONAL",
      status: "ARMED",
      last_check_in: new Date().toISOString(),
      check_in_interval: sanitizedInterval,
      actions: sanitizedActions,
      description : payload.description
    })
    .select()
    .single();

  if (switchErr) {
    console.error("[createSwitch] DB Error:", switchErr);
    throw new Error(switchErr.message);
  }

  // 4. Link selected contacts with status = 'pending'
  if (Array.isArray(payload.contacts) && payload.contacts.length > 0) {
    const contactLinks = payload.contacts.map((c) => ({
      switch_id: newSwitch.id,
      contact_id: c.contact_id || c.id,
      priority_score: Number(c.priority_score ?? 0),
      trust_score: Number(c.trust_score ?? 0),
      status: "pending",
      ack_token: null,
      notified_at: null,
      acknowledged_at: null,
    }));

    const { error: contactsErr } = await supabase
      .from("switch_contacts")
      .insert(contactLinks);

    if (contactsErr) {
      console.error("[createSwitch] Contact Link Error:", contactsErr);
    }
  }

  // 5. Insert disclosures/briefings into info_to_release
  if (Array.isArray(payload.beacon_rows) && payload.beacon_rows.length > 0) {
    const disclosureRows = payload.beacon_rows.map((row) => ({
      switch_id: newSwitch.id,
      content: row.content?.trim(),
      trust_required: Number(row.trust_required ?? 0),
      target_contact_id: row.target_contact_id || null, // null prevents Postgres UUID syntax error
    }));

    const { error: disclosureErr } = await supabase
      .from("info_to_release")
      .insert(disclosureRows);

    if (disclosureErr) {
      console.error("[createSwitch] Disclosures Error:", disclosureErr);
      throw new Error(disclosureErr);
    }
  }

  revalidatePath("/dashboard/switches");
  return newSwitch;
}

/**
 * 2. GET SWITCH BY ID
 * Retrieves switch with its current status, normalized interval,
 * linked contacts (including priority, trust, status, ack dates), and payloads.
 */
export async function getSwitchById(switchId) {
  const supabase = await createSupabaseServerClient();

  const { data: sw, error } = await supabase
    .from("switches")
    .select(`
      id,
      usr_id,
      name,
      criticality,
      purpose,
      status,
      last_check_in,
      check_in_interval,
      actions,
      created_at,
      switch_contacts (
        id,
        priority_score,
        trust_score,
        contact_id,
        status,
        notified_at,
        acknowledged_at,
        contacts (
          id,
          contact_name,
          email
        )
      ),
      info_to_release (
        id,
        content,
        trust_required,
        target_contact_id
      )
    `)
    .eq("id", switchId)
    .single();

  if (error || !sw) {
    console.error("[getSwitchById] Error:", error);
    return null;
  }

  const normalizedInterval = {
    months: sw.check_in_interval?.months ?? 0,
    days: sw.check_in_interval?.days ?? 0,
    hours: sw.check_in_interval?.hours ?? 0,
    minutes: sw.check_in_interval?.minutes ?? 0,
  };

  const normalizedActions = {
    email: sw.actions?.email ?? true,
    modules: {
      beacon: sw.actions?.modules?.beacon ?? true,
      data_release: sw.actions?.modules?.data_release ?? false,
      purge: sw.actions?.modules?.purge ?? false,
      lockdown: sw.actions?.modules?.lockdown ?? false,
      ...sw.actions?.modules,
    },
  };

  return {
    ...sw,
    status: sw.status || "ARMED",
    check_in_interval: normalizedInterval,
    actions: normalizedActions,
    criticality: sw.criticality || "OPERATIONAL",
    purpose: sw.purpose || "PERSONAL",
  };
}

/**
 * 3. UPDATE SWITCH
 * Updates metadata, interval, and actions without altering timing, status, or user ID.
 */
export async function updateSwitch(switchId, updatePayload) {
  const supabase = await createSupabaseServerClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("switches")
    .select("actions, check_in_interval, status")
    .eq("id", switchId)
    .single();

  if (fetchErr || !existing) {
    throw new Error("Target switch not found or access denied.");
  }

  const sanitizedInterval = {
    months: Number(updatePayload.check_in_interval?.months ?? existing.check_in_interval?.months ?? 0),
    days: Number(updatePayload.check_in_interval?.days ?? existing.check_in_interval?.days ?? 0),
    hours: Number(updatePayload.check_in_interval?.hours ?? existing.check_in_interval?.hours ?? 0),
    minutes: Number(updatePayload.check_in_interval?.minutes ?? existing.check_in_interval?.minutes ?? 0),
  };

  const mergedActions = {
    ...existing.actions,
    ...updatePayload.actions,
    modules: {
      ...(existing.actions?.modules || {}),
      ...(updatePayload.actions?.modules || {}),
    },
  };

  const updateFields = {
    name: updatePayload.name?.trim(),
    criticality: updatePayload.criticality || "OPERATIONAL",
    purpose: updatePayload.purpose?.trim() || "PERSONAL",
    check_in_interval: sanitizedInterval,
    actions: mergedActions,
  };

  const { data: updatedSwitch, error: updateErr } = await supabase
    .from("switches")
    .update(updateFields)
    .eq("id", switchId)
    .select()
    .single();

  if (updateErr) {
    console.error("[updateSwitch] DB Error:", updateErr);
    throw new Error(updateErr.message);
  }

  revalidatePath(`/dashboard/switches/${switchId}`);
  revalidatePath("/dashboard/switches");
  return updatedSwitch;
}

/**
 * 4. RE-ARM SWITCH
 * Resets a RESOLVED or EXHAUSTED switch back to 'ARMED', updates last_check_in to now,
 * and resets all linked switch_contacts back to 'pending'.
 */

export async function rearmSwitch(switchId) {
  const supabase = await createSupabaseServerClient();

  // 1. Reset parent switch
  const { data: sw, error: switchErr } = await supabase
    .from("switches")
    .update({
      status: "ARMED",
      last_check_in: new Date().toISOString(),
    })
    .eq("id", switchId)
    .select()
    .single();

  if (switchErr) {
    throw new Error(`Failed to re-arm switch: ${switchErr.message}`);
  }

  // 2. Reset contacts back to pending
  await supabase
    .from("switch_contacts")
    .update({
      status: "pending",
      ack_token: null,
      notified_at: null,
      acknowledged_at: null,
    })
    .eq("switch_id", switchId);

  // 3. Log re-arming event
  await supabase.from("escalation_logs").insert({
    usr_id: sw.usr_id,
    switch_id: switchId,
    event_type: "CHECKIN_PULSE",
    channel: "DASHBOARD",
    status: "SUCCESS",
    details: `Operator manually re-armed switch ${sw.name}. Status reset to ARMED, contacts reset to pending.`,
  });

  revalidatePath(`/dashboard/switches/${switchId}`);
  revalidatePath("/dashboard/switches");
  return sw;
}


export async function removeSwitch(swId) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("switches")
    .delete()
    .eq("id", swId)
    .eq("usr_id", user.id);

  if (error) {
    console.error("[Supabase Error] removeSwitch:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/switches");
  return { success: true };
}


export async function triggerHeartbeat() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("switches")
    .update({ last_check_in: new Date().toISOString() })
    .eq("usr_id", user.id);

  if (error) {
    console.error("[Supabase Error] Master Heartbeat failed:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/switches");
  return { success: true };
}

/**
 * 6. Single Switch Check-In
 */
export async function checkInSingleSwitch(swId) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("switches")
    .update({ last_check_in: new Date().toISOString() })
    .eq("id", swId)
    .eq("usr_id", user.id);

  if (error) {
    console.error("[Supabase Error] checkInSingleSwitch failed:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/switches");
  revalidatePath(`/dashboard/switches/${swId}`);
  return { success: true };
}