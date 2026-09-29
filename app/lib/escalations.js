import { Resend } from "resend";
import { getValidGoogleAccessToken, grantDriveFileAccess } from "./google-drive";
import { executeLockdownWebhook } from "./webhooks";

const resend = new Resend(process.env.RESEND_API_KEY);

// Wait window before escalating to next tier
export const ACK_TIMEOUT_MS = 1 * 60 * 1000;

export async function processSwitchEscalation(supabase, sw) {
  const switchId = sw.id;

  // TRIGGER INFRASTRUCTURE LOCKDOWN (If configured and not yet executed)
  if (sw.actions?.modules?.lockdown && !sw.actions?.lockdown_executed) {
    await executeLockdownWebhook(supabase, sw);
  }

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
    await supabase.from("escalation_logs").insert({
      usr_id: sw.usr_id,
      switch_id: switchId,
      event_type: "TRIGGER_FIRED",
      channel: "SYSTEM",
      status: "FAILED",
      details: "Escalation halted: No contacts linked to this switch.",
    });
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

      await supabase.from("escalation_logs").insert({
        usr_id: sw.usr_id,
        switch_id: switchId,
        event_type: "ESCALATION_TIMEOUT",
        channel: "SYSTEM",
        recipient_email: contact.contacts?.email,
        trust_tier: contact.trust_score,
        status: "SUCCESS",
        details: `Wait window expired without acknowledgment for ${
          contact.contacts?.contact_name || contact.contacts?.email
        }. Cascading to next priority tier.`,
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
      details: "All priority tiers timed out. Switch marked as EXHAUSTED with zero acknowledgments.",
    });

    return { status: "EXHAUSTED" };
  }

  // 6. Identify highest priority score among pending contacts
  const highestPriority = Math.max(
    ...pendingContacts.map((c) => Number(c.priority_score) || 0)
  );

  // 7. Batch contacts sharing highest priority
  const batchToNotify = pendingContacts.filter(
    (c) => (Number(c.priority_score) || 0) === highestPriority
  );

  // 8. Fetch disclosure payloads (including file_metadata)
  const { data: payloads, error: payloadErr } = await supabase
    .from("info_to_release")
    .select("id, content, trust_required, target_contact_id, file_metadata")
    .eq("switch_id", switchId);

  if (payloadErr) {
    console.error("[Escalation] Error fetching payloads:", payloadErr);
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // 9. Dispatch batch
  for (const target of batchToNotify) {
    const recipientEmail = target.contacts?.email;
    const recipientName = target.contacts?.contact_name || "Designated Contact";

    if (!recipientEmail) continue;

    const ackToken = crypto.randomUUID();

    try {
      // Filter authorized payloads
      const authorizedPayloads = (payloads || []).filter((p) => {
        const isException = Number(p.trust_required) === -1 || Boolean(p.target_contact_id);

        if (isException) {
          return (
            Boolean(p.target_contact_id) &&
            String(p.target_contact_id) === String(target.contact_id || target.contacts?.id)
          );
        }

        const trustReq = Number(p.trust_required);
        const contactTrust = Number(target.trust_score ?? 0);
        return trustReq >= 0 && contactTrust >= trustReq;
      });

      const ackUrl = `${baseUrl}/api/ack/${ackToken}`;

      // Retrieve valid access token (using supabase client)
      let accessToken = null;
      try {
        accessToken = await getValidGoogleAccessToken(supabase, sw.usr_id);
      } catch (tokenErr) {
        console.warn("[Escalation] Failed retrieving Drive access token:", tokenErr);
      }

      // Grant permissions on attached files
      for (const info of authorizedPayloads) {
        const files = Array.isArray(info.file_metadata) ? info.file_metadata : [];
        if (files.length > 0 && accessToken) {
          for (const file of files) {
            await grantDriveFileAccess(accessToken, file.id, recipientEmail);
          }
        }
      }

      // Build payload HTML safely
      const payloadHtml =
        authorizedPayloads.length > 0
          ? authorizedPayloads
              .map(
                (p, idx) => `
                <div style="background:#111622; border:1px solid #1e293b; border-radius:6px; padding:12px; margin-bottom:10px;">
                  <p style="color:#94a3b8; font-size:11px; margin:0 0 6px 0; text-transform:uppercase;">Disclosure #${idx + 1}</p>
                  <div style="color:#f1f5f9; font-family:monospace; font-size:13px; white-space:pre-wrap;">${
                    p.content || "<i>No text message attached.</i>"
                  }</div>
                  
                  ${
                    Array.isArray(p.file_metadata) && p.file_metadata.length > 0
                      ? `
                    <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #1e293b;">
                      <div style="font-size: 10px; text-transform: uppercase; color: #38bdf8; font-weight: 700; margin-bottom: 6px;">Attached Drive Assets</div>
                      ${p.file_metadata
                        .map(
                          (f) => `
                        <div style="margin-bottom: 4px;">
                          📄 <a href="${f.webViewLink}" target="_blank" style="color: #60a5fa; text-decoration: underline; font-size: 13px;">${f.name}</a>
                        </div>
                      `
                        )
                        .join("")}
                    </div>
                  `
                      : ""
                  }
                </div>`
              )
              .join("")
          : `<p style="color:#64748b; font-style:italic;">No secret disclosures designated for your security clearance tier.</p>`;

      // Send outbound email
      await resend.emails.send({
        from: "Vigil Sentinel <sentinel@shaaf.me>",
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
    } catch (dispatchErr) {
      console.error(`[Escalation] Fatal error dispatching to ${recipientEmail}:`, dispatchErr);

      await supabase.from("escalation_logs").insert({
        usr_id: sw.usr_id,
        switch_id: switchId,
        event_type: "PAYLOAD_DISPATCHED",
        channel: "EMAIL",
        recipient_email: recipientEmail,
        trust_tier: target.trust_score,
        status: "FAILED",
        details: `Failed to dispatch email: ${dispatchErr.message}`,
      });
    }
  }

  return { status: "BATCH_DISPATCHED", priority: highestPriority, count: batchToNotify.length };
}