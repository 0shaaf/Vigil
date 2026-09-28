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
      description: payload.description
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
  const beaconRows = payload.beacon_rows || [];
  if (beaconRows.length > 0) {
    const infoInserts = beaconRows.map((row) => ({
      switch_id: newSwitch.id,
      content: row.content || "",
      trust_required: row.trust_required,
      target_contact_id: row.target_contact_id || null,
      file_metadata: Array.isArray(row.file_metadata) ? row.file_metadata : [],
    }));

    const { error: infoErr } = await supabase
      .from("info_to_release")
      .insert(infoInserts);

    if (infoErr) {
      console.error("[createSwitch] Error inserting disclosures:", infoErr);
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
        target_contact_id,
        file_metadata
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


/*
 * 3. UPDATE SWITCH
 * Updates metadata, interval, modular actions, and synchronized disclosure payloads
 * (including Google Drive file_metadata).
 */
export async function updateSwitch(switchId, updatePayload) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new Error("Unauthorized. Please log in to update this switch.");
  }

  // 1. Verify switch ownership
  const { data: existing, error: fetchErr } = await supabase
    .from("switches")
    .select("id, usr_id, actions, check_in_interval, status")
    .eq("id", switchId)
    .eq("usr_id", user.id)
    .single();

  if (fetchErr || !existing) {
    throw new Error("Target switch not found or access denied.");
  }

  // 2. Sanitize countdown interval
  const sanitizedInterval = {
    months: Number(updatePayload.check_in_interval?.months ?? existing.check_in_interval?.months ?? 0),
    days: Number(updatePayload.check_in_interval?.days ?? existing.check_in_interval?.days ?? 0),
    hours: Number(updatePayload.check_in_interval?.hours ?? existing.check_in_interval?.hours ?? 0),
    minutes: Number(updatePayload.check_in_interval?.minutes ?? existing.check_in_interval?.minutes ?? 0),
  };

  const totalMinutes =
    sanitizedInterval.months * 43200 +
    sanitizedInterval.days * 1440 +
    sanitizedInterval.hours * 60 +
    sanitizedInterval.minutes;

  if (totalMinutes <= 0) {
    throw new Error("Interval duration must be greater than zero minutes.");
  }

  // 3. Merge actions and module flags
  const mergedActions = {
    ...existing.actions,
    ...updatePayload.actions,
    modules: {
      ...(existing.actions?.modules || {}),
      ...(updatePayload.actions?.modules || {}),
    },
  };

  // 4. Update parent switch record
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
    .eq("usr_id", user.id)
    .select()
    .single();

  if (updateErr) {
    console.error("[updateSwitch] DB Error:", updateErr);
    throw new Error(updateErr.message);
  }

  // 5. Synchronize Disclosures (info_to_release)
  if (Array.isArray(updatePayload.beacon_rows)) {
    // Delete old disclosures for this switch
    const { error: deleteErr } = await supabase
      .from("info_to_release")
      .delete()
      .eq("switch_id", switchId);

    if (deleteErr) {
      console.error("[updateSwitch] Error removing stale disclosures:", deleteErr);
      throw new Error("Failed to clear previous disclosures.");
    }

    // Insert updated disclosure rows if beacon module is enabled
    if (mergedActions.modules?.beacon && updatePayload.beacon_rows.length > 0) {
      const infoInserts = updatePayload.beacon_rows.map((row) => {
        const trustVal = Number(row.trust_required ?? 50);
        return {
          switch_id: switchId,
          content: row.content?.trim() || "",
          trust_required: trustVal,
          target_contact_id:
            trustVal === -1 && row.target_contact_id ? row.target_contact_id : null,
          file_metadata: Array.isArray(row.file_metadata) ? row.file_metadata : [],
        };
      });

      const { error: insertErr } = await supabase
        .from("info_to_release")
        .insert(infoInserts);

      if (insertErr) {
        console.error("[updateSwitch] Error inserting updated disclosures:", insertErr);
        throw new Error("Failed to save updated disclosure items.");
      }
    }
  }

  revalidatePath(`/dashboard/switches/${switchId}`);
  revalidatePath("/dashboard/switches");
  revalidatePath("/dashboard");
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