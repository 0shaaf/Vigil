"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../lib/supabase/server-client";

/**
 * 1. Fetch single switch with its joined contacts & payloads
 */
export async function getSwitchById(swid) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized", data: null };

  const { data, error } = await supabase
  .from("switches")
  .select(`
    *,
    switch_contacts (
      id,
      contact_id,
      priority_score,
      trust_score,
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
      target_contact:contacts!target_contact_id (
        id,
        contact_name,
        email
      )
    )
  `)
  .eq("id", swid)
  .eq("usr_id", user.id)
  .single();

  if (error) {
    // console.error("[Supabase Error] getSwitchById:", error);
    return { error: error.message, data: null };
  }

  return { data, error: null };
}

/**
 * 2. Create Switch, Junction Contacts, and Payloads
 */
export async function createSwitch(payload) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Step A: Insert parent switch
  const { data: newSwitch, error: switchError } = await supabase
    .from("switches")
    .insert({
      usr_id: user.id,
      name: payload.name,
      description: payload.description || null,
      check_in_interval: {
        months: Number(payload.check_in_interval?.months || 0),
        days: Number(payload.check_in_interval?.days || 0),
        hours: Number(payload.check_in_interval?.hours || 0),
      },
      actions: {
        call: Boolean(payload.actions?.call),
        email: Boolean(payload.actions?.email),
        forwardData: Boolean(payload.actions?.forwardData),
      },
      last_check_in: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (switchError) {
    console.error("[Supabase Error] Creating Switch:", switchError);
    return { error: switchError.message };
  }

  const switchId = newSwitch.id;

  // Step B: Insert switch_contacts junction rows
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

  // Step C: Insert info_to_release rows with clearance rules
  const rawInfoRows = payload.info_to_release || payload.info_rows || [];
  const validInfoRows = rawInfoRows.filter((r) => {
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
        // Rule: target_contact_id is strictly null unless trust_required = -1
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
export async function updateSwitch(swId, payload) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Step A: Update master switch parameters
  const { error: switchError } = await supabase
    .from("switches")
    .update({
      name: payload.name,
      description: payload.description || null,
      check_in_interval: {
        months: Number(payload.check_in_interval?.months || 0),
        days: Number(payload.check_in_interval?.days || 0),
        hours: Number(payload.check_in_interval?.hours || 0),
      },
      actions: {
        call: Boolean(payload.actions?.call),
        email: Boolean(payload.actions?.email),
        forwardData: Boolean(payload.actions?.forwardData),
      },
    })
    .eq("id", swId)
    .eq("usr_id", user.id);

  if (switchError) {
    console.error("[Supabase Error] Updating Switch:", switchError);
    return { error: switchError.message };
  }

  // Step B: Replace switch_contacts
  await supabase.from("switch_contacts").delete().eq("switch_id", swId);

  const contactRows = (payload.contacts || []).filter(
    (c) => c.selected !== false && c.contact_id
  );

  if (contactRows.length > 0) {
    const parsedContacts = contactRows.map((c) => ({
      switch_id: swId,
      contact_id: c.contact_id,
      priority_score: Number(c.priority_score ?? 1),
      trust_score: Number(c.trust_score ?? 1),
    }));

    const { error: contactsError } = await supabase
      .from("switch_contacts")
      .insert(parsedContacts);

    if (contactsError) {
      console.error("[Supabase Error] Updating Switch Contacts:", contactsError);
      return { error: contactsError.message };
    }
  }

  // Step C: Replace info_to_release
  await supabase.from("info_to_release").delete().eq("switch_id", swId);

  const rawInfoRows = payload.info_to_release || payload.info_rows || [];
  const validInfoRows = rawInfoRows.filter((r) => {
    const text = r.content ?? r.value ?? "";
    return typeof text === "string" && text.trim() !== "";
  });

  if (validInfoRows.length > 0) {
    const parsedPayloads = validInfoRows.map((r) => {
      const trustRequired = Number(r.trust_required ?? r.minTrust ?? 50);
      const targetContact = r.target_contact_id ?? r.exceptionContactID ?? null;

      return {
        switch_id: swId,
        content: (r.content ?? r.value).trim(),
        trust_required: trustRequired,
        target_contact_id: trustRequired === -1 && targetContact ? targetContact : null,
      };
    });

    const { error: infoError } = await supabase
      .from("info_to_release")
      .insert(parsedPayloads);

    if (infoError) {
      console.error("[Supabase Error] Updating info_to_release:", infoError);
      return { error: infoError.message };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/switches");
  revalidatePath(`/dashboard/switches/${swId}`);
  return { success: true };
}

/**
 * 4. Remove Switch (Relies on Postgres ON DELETE CASCADE for children)
 */
export async function removeSwitch(swId) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Explicit usr_id check prevents deleting records owned by other users
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
 * 5. Master Heartbeat (Renews all switches owned by operator)
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
 * 6. Single Switch Check-In (Renews one switch timer)
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