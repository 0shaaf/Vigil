import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Default wait window: 24 hours (change to 5 * 60 * 1000 for local 5-minute testing)
export const ACK_TIMEOUT_MS = 1 * 60 * 1000;

export async function processSwitchEscalation(supabase, sw) {
  const switchId = sw.id;

  // 1. Fetch all linked contacts with their current status, priority, and trust ratings
  const { data: switchContacts, error: scErr } = await supabase
    .from("switch_contacts")
    .select(`
      id,
      priority_score,
      trust_score,
      contact_id,
      ack_token,
      notified_at,
      status,
      contacts (
        id,
        contact_name,
        email
      )
    `)
    .eq("switch_id", switchId);

  if (scErr || !switchContacts || switchContacts.length === 0) {
    return { status: "NO_CONTACTS" };
  }

  // 2. If ANY contact has already acknowledged, ensure switch is RESOLVED and halt
  const hasAcked = switchContacts.some((c) => c.status === "acked");
  if (hasAcked) {
    if (sw.status !== "RESOLVED") {
      await supabase
        .from("switches")
        .update({ status: "RESOLVED" })
        .eq("id", switchId);
    }
    return { status: "HALTED_ACKNOWLEDGED" };
  }

  const now = Date.now();

  // 3. Check timeouts for contacts currently in 'notified' status
  const notifiedContacts = switchContacts.filter((c) => c.status === "notified");

  for (const contact of notifiedContacts) {
    const elapsed = now - new Date(contact.notified_at).getTime();

    if (elapsed >= ACK_TIMEOUT_MS) {
      await supabase
        .from("switch_contacts")
        .update({ status: "timed_out" })
        .eq("id", contact.id);

      contact.status = "timed_out";

      // Log the timeout event
      await supabase.from("escalation_logs").insert({
        usr_id: sw.usr_id,
        switch_id: switchId,
        event_type: "ESCALATION_TIMEOUT",
        channel: "SYSTEM",
        recipient_email: contact.contacts?.email,
        trust_tier: contact.trust_score,
        status: "SUCCESS",
        details: `Wait window expired without acknowledgment for ${contact.contacts?.contact_name || contact.contacts?.email}. Cascading to next priority tier.`,
      });
    }
  }

  // 4. If there are still active 'notified' contacts whose window hasn't expired, keep waiting
  const stillWaiting = switchContacts.some((c) => c.status === "notified");
  if (stillWaiting) {
    return { status: "WAITING_FOR_ACK" };
  }

  // 5. Find remaining 'pending' contacts
  const pendingContacts = switchContacts.filter((c) => c.status === "pending");

  if (pendingContacts.length === 0) {
    // All priority tiers exhausted without acknowledgment -> Transition switch to EXHAUSTED
    await supabase
      .from("switches")
      .update({ status: "EXHAUSTED" })
      .eq("id", switchId);

    await supabase.from("escalation_logs").insert({
      usr_id: sw.usr_id,
      switch_id: switchId,
      event_type: "TRIGGER_FIRED",
      channel: "SYSTEM",
      status: "FAILED",
      details: "All priority tiers have timed out. Switch marked as EXHAUSTED with zero acknowledgments.",
    });

    return { status: "EXHAUSTED" };
  }

  // 6. Identify the highest priority score among remaining pending contacts
  const highestPriority = Math.max(
    ...pendingContacts.map((c) => Number(c.priority_score) || 0)
  );

  // 7. Get ALL pending contacts sharing this highest priority (batch dispatch)
  const batchToNotify = pendingContacts.filter(
    (c) => (Number(c.priority_score) || 0) === highestPriority
  );

  // 8. Fetch disclosure payloads tied to this switch (no usr_id column needed)
  const { data: payloads } = await supabase
    .from("info_to_release")
    .select("id, content, trust_required, target_contact_id")
    .eq("switch_id", switchId);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // 9. Dispatch emails with individual acknowledgment tokens
  for (const target of batchToNotify) {
    const recipientEmail = target.contacts?.email;
    const recipientName = target.contacts?.contact_name || "Designated Contact";

    if (!recipientEmail) continue;

    const ackToken = crypto.randomUUID();

    // Match payloads: trust_required <= contact trust_score OR direct target match
    const authorizedPayloads = (payloads || []).filter((p) => {
      const meetsTrust = (p.trust_required ?? 0) <= (target.trust_score ?? 0);
      const isDirectTarget = p.target_contact_id === target.contact_id;
      return meetsTrust || isDirectTarget;
    });

    const ackUrl = `${baseUrl}/api/ack/${ackToken}`;

    const payloadHtml =
      authorizedPayloads.length > 0
        ? authorizedPayloads
            .map(
              (p, idx) => `
              <div style="background:#111622; border:1px solid #1e293b; border-radius:6px; padding:12px; margin-bottom:10px;">
                <p style="color:#94a3b8; font-size:11px; margin:0 0 6px 0; text-transform:uppercase;">Disclosure #${idx + 1}</p>
                <div style="color:#f1f5f9; font-family:monospace; font-size:13px; white-space:pre-wrap;">${p.content}</div>
              </div>`
            )
            .join("")
        : `<p style="color:#64748b; font-style:italic;">No secret disclosures designated for your security clearance tier.</p>`;

    try {
      await resend.emails.send({
        from: "Vigil Sentinel <onboarding@resend.dev>",
        to: recipientEmail,
        subject: `[ACTION REQUIRED] Dead Man's Switch Triggered: ${sw.name}`,
        html: `
          <div style="background-color:#08090c; color:#f1f5f9; font-family:sans-serif; padding:32px 24px;">
            <div style="max-width:560px; margin:0 auto; background:#0d111a; border:1px solid #1e293b; border-radius:10px; padding:28px;">
              <h2 style="color:#ffffff; margin:0 0 8px 0; font-size:18px;">Vigil Fail-Safe Trigger Notification</h2>
              <p style="color:#94a3b8; font-size:13px; line-height:1.5;">
                Hello <strong>${recipientName}</strong>,<br/>
                The automated sentinel <strong>${sw.name}</strong> has failed to receive an operator pulse and has tripped. You are receiving this because of your priority clearance tier (<strong>Priority: ${highestPriority}</strong>).
              </p>

              <div style="margin:24px 0;">
                <h3 style="color:#38bdf8; font-size:12px; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:10px;">Released Payloads</h3>
                ${payloadHtml}
              </div>

              <div style="margin-top:28px; text-align:center; padding-top:20px; border-top:1px solid #1e293b;">
                <p style="color:#94a3b8; font-size:12px; margin-bottom:14px;">
                  Please acknowledge receipt to halt further waterfall escalation to secondary contacts.
                </p>
                <a href="${ackUrl}" style="background-color:#0284c7; color:#ffffff; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:bold; font-size:13px; display:inline-block;">
                  Acknowledge Incident & Halt Escalation
                </a>
              </div>
            </div>
          </div>
        `,
      });

      // Update contact status to 'notified'
      await supabase
        .from("switch_contacts")
        .update({
          status: "notified",
          notified_at: new Date().toISOString(),
          ack_token: ackToken,
        })
        .eq("id", target.id);

      // Log dispatch
      await supabase.from("escalation_logs").insert({
        usr_id: sw.usr_id,
        switch_id: switchId,
        event_type: "PAYLOAD_DISPATCHED",
        channel: "EMAIL",
        recipient_email: recipientEmail,
        trust_tier: target.trust_score,
        status: "SUCCESS",
        details: `Dispatched priority ${highestPriority} escalation to ${recipientName} with ${authorizedPayloads.length} payloads.`,
        execution_metadata: { ack_token: ackToken, priority_score: highestPriority },
      });
    } catch (sendErr) {
      console.error(`[Escalation] Error notifying ${recipientEmail}:`, sendErr);

      await supabase.from("escalation_logs").insert({
        usr_id: sw.usr_id,
        switch_id: switchId,
        event_type: "PAYLOAD_DISPATCHED",
        channel: "EMAIL",
        recipient_email: recipientEmail,
        trust_tier: target.trust_score,
        status: "FAILED",
        details: `Failed to dispatch email: ${sendErr.message}`,
      });
    }
  }

  return { status: "BATCH_DISPATCHED", priority: highestPriority, count: batchToNotify.length };
}