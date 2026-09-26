"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../lib/supabase/server-client";
// Or your standard server Supabase client



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
      last_check_in,
      check_in_interval,
      actions,
      created_at,
      switch_contacts (
        id,
        priority_score,
        trust_score,
        contact_id,
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
    console.error("[getSwitchById] Fetch error:", error);
    return null;
  }

  // Normalize check_in_interval so the form never receives undefined fields
  const normalizedInterval = {
    months: sw.check_in_interval?.months ?? 0,
    days: sw.check_in_interval?.days ?? 0,
    hours: sw.check_in_interval?.hours ?? 0,
    minutes: sw.check_in_interval?.minutes ?? 0,
  };

  // Normalize actions to ensure the modules schema is always populated
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
    check_in_interval: normalizedInterval,
    actions: normalizedActions,
    criticality: sw.criticality || "OPERATIONAL",
    purpose: sw.purpose || "PERSONAL",
  };
}

/**
 * 2. Create Switch, Junction Contacts, and Action Manifest
 */
export async function createSwitch(payload) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Step A: Format unified action payload
  const formattedActions = {
    modules: payload.action_modules || {
      beacon: true,
      data_release: false,
      purge: false,
      lockdown: false,
    },
    data_releases: payload.data_releases || [],
    purge_config: payload.purge_config || null,
    lockdown_config: payload.lockdown_config || null,
    // Backwards compatibility with legacy flags
    call: Boolean(payload.actions?.call),
    email: Boolean(payload.actions?.email ?? true),
    forwardData: Boolean(payload.actions?.forwardData),
  };

  // Step B: Insert parent switch record
  const { data: newSwitch, error: switchError } = await supabase
    .from("switches")
    .insert({
      usr_id: user.id,
      name: payload.name,
      description: payload.description || null,
      purpose: payload.purpose || "PERSONAL",
      criticality: payload.criticality || "OPERATIONAL",
      check_in_interval: {
        months: Number(payload.check_in_interval?.months || 0),
        days: Number(payload.check_in_interval?.days || 0),
        hours: Number(payload.check_in_interval?.hours || 0),
        minutes: Number(payload.check_in_interval?.minutes || 0),
      },
      actions: formattedActions,
      last_check_in: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (switchError) {
    console.error("[Supabase Error] Creating Switch:", switchError);
    return { error: switchError.message };
  }

  const switchId = newSwitch.id;

  // Step C: Insert switch_contacts junction rows
  const contactRows = (payload.contacts || []).filter(
    (c) => c.selected !== false && c.contact_id
  );

  if (contactRows.length > 0) {
    const parsedContacts = contactRows.map((c) => ({
      switch_id: switchId,
      contact_id: c.contact_id,
      priority_score: Number(c.priority_score ?? 1),
      trust_score: Number(c.trust_score ?? 1),
    }));

    const { error: contactsError } = await supabase
      .from("switch_contacts")
      .insert(parsedContacts);

    if (contactsError) {
      console.error("[Supabase Error] Inserting Switch Contacts:", contactsError);
      return { error: contactsError.message };
    }
  }

  // Step D: Insert Reach Out / Beacon Disclosures into info_to_release
  const beaconEnabled = payload.action_modules?.beacon ?? true;
  const rawBeaconRows = beaconEnabled
    ? payload.beacon_rows || payload.info_to_release || payload.info_rows || []
    : [];

  const validInfoRows = rawBeaconRows.filter((r) => {
    const text = r.content ?? r.value ?? "";
    return typeof text === "string" && text.trim() !== "";
  });

  if (validInfoRows.length > 0) {
    const parsedPayloads = validInfoRows.map((r) => {
      const trustRequired = Number(r.trust_required ?? r.minTrust ?? 50);
      const targetContact = r.target_contact_id ?? r.exceptionContactID ?? null;

      return {
        switch_id: switchId,
        content: (r.content ?? r.value).trim(),
        trust_required: trustRequired,
        target_contact_id: trustRequired === -1 && targetContact ? targetContact : null,
      };
    });

    const { error: infoError } = await supabase
      .from("info_to_release")
      .insert(parsedPayloads);

    if (infoError) {
      console.error("[Supabase Error] Inserting info_to_release:", infoError);
      return { error: infoError.message };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/switches");
  return { success: true, id: switchId };
}

/**
 * 3. Update Switch: Updates parent and cleanly replaces children
 */

export async function updateSwitch(switchId, updatePayload) {
  const supabase = await createClient();

  // 1. Fetch current switch to merge complex JSON fields safely
  const { data: existing, error: fetchErr } = await supabase
    .from("switches")
    .select("actions, check_in_interval")
    .eq("id", switchId)
    .single();

  if (fetchErr || !existing) {
    throw new Error("Target switch not found or access denied.");
  }

  // 2. Prepare merged check_in_interval
  const sanitizedInterval = {
    months: Number(updatePayload.check_in_interval?.months ?? existing.check_in_interval?.months ?? 0),
    days: Number(updatePayload.check_in_interval?.days ?? existing.check_in_interval?.days ?? 0),
    hours: Number(updatePayload.check_in_interval?.hours ?? existing.check_in_interval?.hours ?? 0),
    minutes: Number(updatePayload.check_in_interval?.minutes ?? existing.check_in_interval?.minutes ?? 0),
  };

  // 3. Prepare merged actions JSON
  const mergedActions = {
    ...existing.actions,
    ...updatePayload.actions,
    modules: {
      ...(existing.actions?.modules || {}),
      ...(updatePayload.actions?.modules || {}),
    },
  };

  // 4. Construct update object (explicitly omitting last_check_in and usr_id)
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

  return updatedSwitch;
}
/**
 * 4. Remove Switch
 */
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

/**
 * 5. Master Heartbeat
 */
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