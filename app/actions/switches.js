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
    console.error("[SERVER ERROR] [createSwitch] Authentication check failed:", {
      authError: authErr?.message,
      hasUser: Boolean(user),
    });
    throw new Error("Unauthorized. Please log in to create a switch.");
  }

  // 1. Sanitize 4-unit interval
  const sanitizedInterval = {
    months: Number(payload.check_in_interval?.months || 0),
    days: Number(payload.check_in_interval?.days || 0),
    hours: Number(payload.check_in_interval?.hours || 0),
    minutes: Number(payload.check_in_interval?.minutes || 0),
  };

  const totalMinutes =
    sanitizedInterval.months * 43200 +
    sanitizedInterval.days * 1440 +
    sanitizedInterval.hours * 60 +
    sanitizedInterval.minutes;

  if (totalMinutes <= 0) {
    console.error("[SERVER ERROR] [createSwitch] Invalid interval duration:", {
      sanitizedInterval,
      totalMinutes,
      userId: user.id,
    });
    throw new Error("Interval duration must be greater than zero minutes.");
  }

  // 2. Preserve module flags AND configs
  const sanitizedActions = {
    email: payload.actions?.email ?? true,
    modules: {
      beacon: payload.actions?.modules?.beacon ?? true,
      lockdown: payload.actions?.modules?.lockdown ?? false,
      ...payload.actions?.modules,
    },
    lockdown_config: payload.actions?.lockdown_config || null,
    lockdown_executed: false,
    lockdown_executed_at: null,
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
      description: payload.description,
    })
    .select()
    .single();

  if (switchErr) {
    console.error("[SERVER ERROR] [createSwitch] Failed inserting switch record into database:", {
      error: switchErr.message,
      details: switchErr.details,
      code: switchErr.code,
      userId: user.id,
      switchName: payload.name,
    });
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
      console.error("[SERVER ERROR] [createSwitch] Failed inserting switch_contacts junction rows:", {
        error: contactsErr.message,
        details: contactsErr.details,
        switchId: newSwitch.id,
        contactsCount: contactLinks.length,
      });
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
      console.error("[SERVER ERROR] [createSwitch] Failed inserting info_to_release disclosure rows:", {
        error: infoErr.message,
        details: infoErr.details,
        switchId: newSwitch.id,
        rowsCount: infoInserts.length,
      });
    }
  }

  revalidatePath("/dashboard/switches");
  return newSwitch;
}

export async function getSwitchById(switchId) {
  const supabase = await createSupabaseServerClient();

  const { data: sw, error } = await supabase
    .from("switches")
    .select(`
      id,
      usr_id,
      name,
      description,
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
    console.error("[SERVER ERROR] [getSwitchById] Failed to fetch switch by ID:", {
      switchId,
      error: error?.message,
      details: error?.details,
      code: error?.code,
    });
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
      lockdown: sw.actions?.modules?.lockdown ?? false,
      ...sw.actions?.modules,
    },
    lockdown_config: sw.actions?.lockdown_config || null,
    lockdown_executed: Boolean(sw.actions?.lockdown_executed),
    lockdown_executed_at: sw.actions?.lockdown_executed_at || null,
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

export async function updateSwitch(switchId, updatePayload) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    console.error("[SERVER ERROR] [updateSwitch] Unauthorized access attempt:", {
      switchId,
      authError: authErr?.message,
      hasUser: Boolean(user),
    });
    throw new Error("Unauthorized. Please log in to update this switch.");
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("switches")
    .select("id, usr_id, actions, check_in_interval, status")
    .eq("id", switchId)
    .eq("usr_id", user.id)
    .single();

  if (fetchErr || !existing) {
    console.error("[SERVER ERROR] [updateSwitch] Target switch not found or unauthorized:", {
      switchId,
      userId: user.id,
      fetchError: fetchErr?.message,
    });
    throw new Error("Target switch not found or access denied.");
  }

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
    console.error("[SERVER ERROR] [updateSwitch] Invalid updated interval duration:", {
      switchId,
      sanitizedInterval,
      totalMinutes,
    });
    throw new Error("Interval duration must be greater than zero minutes.");
  }

  const mergedActions = {
    ...existing.actions,
    ...updatePayload.actions,
    modules: {
      ...(existing.actions?.modules || {}),
      ...(updatePayload.actions?.modules || {}),
    },
    lockdown_config:
      updatePayload.actions?.lockdown_config !== undefined
        ? updatePayload.actions.lockdown_config
        : existing.actions?.lockdown_config || null,
  };

  const updateFields = {
    name: updatePayload.name?.trim(),
    description: updatePayload.description !== undefined ? updatePayload.description : existing.description,
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
    console.error("[SERVER ERROR] [updateSwitch] Failed updating switch record:", {
      switchId,
      userId: user.id,
      error: updateErr.message,
      details: updateErr.details,
    });
    throw new Error(updateErr.message);
  }

  // Synchronize Contacts
  if (Array.isArray(updatePayload.contacts)) {
    const { error: deleteContactsErr } = await supabase
      .from("switch_contacts")
      .delete()
      .eq("switch_id", switchId);

    if (deleteContactsErr) {
      console.error("[SERVER ERROR] [updateSwitch] Failed clearing stale contact links:", {
        switchId,
        error: deleteContactsErr.message,
      });
    } else if (updatePayload.contacts.length > 0) {
      const contactLinks = updatePayload.contacts.map((c) => ({
        switch_id: switchId,
        contact_id: c.contact_id || c.id,
        priority_score: Number(c.priority_score ?? 1),
        trust_score: Number(c.trust_score ?? 50),
        status: "pending",
      }));

      const { error: insertContactsErr } = await supabase
        .from("switch_contacts")
        .insert(contactLinks);

      if (insertContactsErr) {
        console.error("[SERVER ERROR] [updateSwitch] Failed inserting updated contact links:", {
          switchId,
          error: insertContactsErr.message,
        });
      }
    }
  }

  // Synchronize Disclosures
  if (Array.isArray(updatePayload.beacon_rows)) {
    const { error: deleteErr } = await supabase
      .from("info_to_release")
      .delete()
      .eq("switch_id", switchId);

    if (deleteErr) {
      console.error("[SERVER ERROR] [updateSwitch] Failed clearing stale disclosure records:", {
        switchId,
        error: deleteErr.message,
        details: deleteErr.details,
      });
      throw new Error("Failed to clear previous disclosures.");
    }

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
        console.error("[SERVER ERROR] [updateSwitch] Failed inserting updated disclosure records:", {
          switchId,
          error: insertErr.message,
          details: insertErr.details,
        });
        throw new Error("Failed to save updated disclosure items.");
      }
    }
  }

  revalidatePath(`/dashboard/switches/${switchId}`);
  revalidatePath("/dashboard/switches");
  revalidatePath("/dashboard");
  return updatedSwitch;
}

export async function rearmSwitch(switchId) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    console.error("[SERVER ERROR] [rearmSwitch] Unauthorized re-arm attempt:", {
      switchId,
      authError: authErr?.message,
    });
    throw new Error("Unauthorized. Please log in to re-arm this switch.");
  }

  const { data: currentSw, error: fetchErr } = await supabase
    .from("switches")
    .select("actions, usr_id, name")
    .eq("id", switchId)
    .eq("usr_id", user.id)
    .single();

  if (fetchErr || !currentSw) {
    console.error("[SERVER ERROR] [rearmSwitch] Target switch not found or unauthorized:", {
      switchId,
      userId: user.id,
      error: fetchErr?.message,
    });
    throw new Error("Switch not found or unauthorized.");
  }

  // Reset execution flags so webhook can fire on next escalation
  const resetActions = {
    ...(currentSw.actions || {}),
    lockdown_executed: false,
    lockdown_executed_at: null,
  };

  const { data: sw, error: switchErr } = await supabase
    .from("switches")
    .update({
      status: "ARMED",
      last_check_in: new Date().toISOString(),
      actions: resetActions,
    })
    .eq("id", switchId)
    .eq("usr_id", user.id)
    .select()
    .single();

  if (switchErr || !sw) {
    console.error("[SERVER ERROR] [rearmSwitch] Database update error re-arming switch:", {
      switchId,
      userId: user.id,
      error: switchErr?.message,
      details: switchErr?.details,
    });
    throw new Error(`Failed to re-arm switch: ${switchErr?.message || "Update failed"}`);
  }

  const { error: contactsErr } = await supabase
    .from("switch_contacts")
    .update({
      status: "pending",
      ack_token: null,
      notified_at: null,
      acknowledged_at: null,
    })
    .eq("switch_id", switchId);

  if (contactsErr) {
    console.error("[SERVER ERROR] [rearmSwitch] Failed resetting switch_contacts status to pending:", {
      switchId,
      error: contactsErr.message,
    });
  }

  const { error: logErr } = await supabase.from("escalation_logs").insert({
    usr_id: user.id,
    switch_id: switchId,
    event_type: "CHECKIN_PULSE",
    channel: "DASHBOARD",
    status: "SUCCESS",
    details: `Operator manually re-armed switch ${sw.name}. Status reset to ARMED, contacts and lockdown flags reset.`,
  });

  if (logErr) {
    console.error("[SERVER ERROR] [rearmSwitch] Failed recording rearm escalation log:", {
      switchId,
      error: logErr.message,
    });
  }

  revalidatePath(`/dashboard/switches/${switchId}`);
  revalidatePath("/dashboard/switches");
  return sw;
}

export async function removeSwitch(swId) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    console.error("[SERVER ERROR] [removeSwitch] Unauthorized access attempt:", {
      switchId: swId,
      authError: authErr?.message,
    });
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("switches")
    .delete()
    .eq("id", swId)
    .eq("usr_id", user.id);

  if (error) {
    console.error("[SERVER ERROR] [removeSwitch] Database error deleting switch:", {
      switchId: swId,
      userId: user.id,
      error: error.message,
      details: error.details,
    });
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/switches");
  return { success: true };
}

function getSwitchDeadline(lastCheckIn, interval) {
  if (!lastCheckIn) return null;
  const deadline = new Date(lastCheckIn);
  if (interval?.months) deadline.setMonth(deadline.getMonth() + Number(interval.months));
  if (interval?.days) deadline.setDate(deadline.getDate() + Number(interval.days));
  if (interval?.hours) deadline.setHours(deadline.getHours() + Number(interval.hours));
  if (interval?.minutes) deadline.setMinutes(deadline.getMinutes() + Number(interval.minutes));
  return deadline;
}

export async function triggerHeartbeat() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    console.error("[SERVER ERROR] [triggerHeartbeat] Unauthorized heartbeat attempt:", {
      authError: authErr?.message,
    });
    return { error: "Unauthorized" };
  }

  // 1. Fetch user's switches to evaluate active and unexpired status
  const { data: userSwitches, error: fetchErr } = await supabase
    .from("switches")
    .select("id, status, last_check_in, check_in_interval")
    .eq("usr_id", user.id);

  if (fetchErr) {
    console.error("[SERVER ERROR] [triggerHeartbeat] Failed fetching switches for heartbeat guard:", {
      userId: user.id,
      error: fetchErr.message,
    });
    return { error: fetchErr.message };
  }

  const now = Date.now();

  // 2. Filter STRICTLY for active, unexpired switches
  // - Status must be "ARMED" (excludes EXHAUSTED, TRIPPED, ESCALATING, PAUSED/STANDBY)
  // - Deadline must be in the future (timeLeft > 0)
  const renewableSwitches = (userSwitches || []).filter((sw) => {
    if (sw.status !== "ARMED") return false;
    if (!sw.last_check_in) return true; // New sentinel awaiting initial pulse
    const deadline = getSwitchDeadline(sw.last_check_in, sw.check_in_interval);
    return deadline ? deadline.getTime() > now : true;
  });

  const renewableIds = renewableSwitches.map((s) => s.id);

  // 3. Renew only the valid active unexpired switches
  if (renewableIds.length > 0) {
    const { error: updateErr } = await supabase
      .from("switches")
      .update({ last_check_in: new Date().toISOString() })
      .in("id", renewableIds);

    if (updateErr) {
      console.error("[SERVER ERROR] [triggerHeartbeat] Active switches renewal update failed:", {
        userId: user.id,
        error: updateErr.message,
      });
      return { error: updateErr.message };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/switches");
  return {
    success: true,
    renewedCount: renewableIds.length,
    totalCount: (userSwitches || []).length,
  };
}

export async function checkInSingleSwitch(swId) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    console.error("[SERVER ERROR] [checkInSingleSwitch] Unauthorized single-switch check-in:", {
      switchId: swId,
      authError: authErr?.message,
    });
    return { error: "Unauthorized" };
  }

  // Verify switch exists and is not expired
  const { data: sw, error: fetchErr } = await supabase
    .from("switches")
    .select("id, status, last_check_in, check_in_interval")
    .eq("id", swId)
    .eq("usr_id", user.id)
    .single();

  if (fetchErr || !sw) {
    return { error: "Sentinel not found or unauthorized" };
  }

  if (sw.status !== "ARMED") {
    return { error: `Cannot check in sentinel with status: ${sw.status}` };
  }

  if (sw.last_check_in) {
    const deadline = getSwitchDeadline(sw.last_check_in, sw.check_in_interval);
    if (deadline && deadline.getTime() <= Date.now()) {
      return { error: "Sentinel countdown has expired and cannot be renewed." };
    }
  }

  const { error } = await supabase
    .from("switches")
    .update({ last_check_in: new Date().toISOString() })
    .eq("id", swId)
    .eq("usr_id", user.id);

  if (error) {
    console.error("[SERVER ERROR] [checkInSingleSwitch] Failed updating single switch check-in:", {
      switchId: swId,
      userId: user.id,
      error: error.message,
      details: error.details,
    });
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/switches");
  revalidatePath(`/dashboard/switches/${swId}`);
  return { success: true };
}