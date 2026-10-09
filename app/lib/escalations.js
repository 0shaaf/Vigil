import { Resend } from "resend";
import { getValidGoogleAccessToken, grantDriveFileAccess } from "./google-drive";
import { executeLockdownWebhook } from "./webhook";

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
    if (scErr) {
      console.error("[SERVER ERROR] [processSwitchEscalation] Database error fetching switch contacts:", {
        switchId,
        error: scErr.message,
        details: scErr.details,
      });
      return { status: "ERROR", error: scErr.message };
    }

    console.log("[SERVER INFO] [processSwitchEscalation] No contacts configured for switch. Proceeding smoothly to EXHAUSTED:", {
      switchId,
      switchName: sw.name,
    });

    await supabase
      .from("switches")
      .update({ status: "EXHAUSTED" })
      .eq("id", switchId);

    await supabase.from("escalation_logs").insert({
      usr_id: sw.usr_id,
      switch_id: switchId,
      event_type: "TRIGGER_FIRED",
      channel: "SYSTEM",
      status: "SUCCESS",
      details: "Fail-safe sequence completed without linked notification contacts. Switch marked EXHAUSTED.",
    });

    return { status: "EXHAUSTED", reason: "NO_CONTACTS" };
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
    console.error("[SERVER ERROR] [processSwitchEscalation] Failed fetching disclosure payloads from database:", {
      switchId,
      error: payloadErr.message,
      details: payloadErr.details,
    });
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
        console.error("[SERVER ERROR] [processSwitchEscalation] Exception retrieving Google Drive access token:", {
          userId: sw.usr_id,
          switchId,
          error: tokenErr.message,
        });
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
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin-bottom: 12px;">
                  <p style="color: #64748b; font-size: 11px; margin: 0 0 8px 0; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Disclosure #${idx + 1}</p>
                  <div style="color: #0f172a; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 13px; white-space: pre-wrap; line-height: 1.6;">${
                    p.content || "No text message attached."
                  }</div>
                  
                  ${
                    Array.isArray(p.file_metadata) && p.file_metadata.length > 0
                      ? `
                    <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
                      <div style="font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; margin-bottom: 6px; letter-spacing: 0.05em;">Attached Drive Assets</div>
                      ${p.file_metadata
                        .map(
                          (f) => `
                        <div style="margin-bottom: 6px;">
                          <a href="${f.webViewLink}" target="_blank" style="color: #ff3b19; text-decoration: underline; font-size: 13px; font-weight: 600;">${f.name}</a>
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
          : `<p style="color: #64748b; font-style: italic; font-size: 13px;">No secret disclosures designated for your security clearance tier.</p>`;

      // Send outbound email
      await resend.emails.send({
        from: "Vigil Sentinel <sentinel@shaaf.me>",
        to: recipientEmail,
        subject: `Fail-Safe Trigger Notification: ${sw.name}`,
        html: `
          <div style="background-color: #f8fafc; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px;">
            <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <div style="font-size: 11px; letter-spacing: 0.08em; color: #ff3b19; text-transform: uppercase; font-weight: 700; margin-bottom: 8px;">
                Fail-Safe Protocol Activated
              </div>
              <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">
                Automated Sentinel Escalation
              </h2>
              <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 14px 0;">
                Recipient: <strong>${recipientName}</strong>
              </p>
              <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                The automated sentinel <strong>${sw.name}</strong> failed to receive an operator pulse within its designated parameter window and has tripped. Pursuant to the operator's instructions, you have been designated as an authorized recipient (Priority Tier: ${highestPriority}).
              </p>

              <div style="margin: 24px 0;">
                <div style="font-size: 11px; letter-spacing: 0.05em; color: #475569; text-transform: uppercase; font-weight: 700; margin-bottom: 12px;">
                  Authorized Disclosures
                </div>
                ${payloadHtml}
              </div>

              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;">
                  Acknowledge receipt to confirm delivery and halt further waterfall escalation to subsequent contacts.
                </p>
                <a href="${ackUrl}" style="background-color: #ff3b19; color: #ffffff; padding: 13px 26px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 13px; letter-spacing: 0.04em; display: inline-block; text-transform: uppercase;">
                  Acknowledge Incident and Halt Escalation
                </a>
              </div>

              <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center;">
                <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.5;">
                  This is a cryptographically signed dispatch generated by the Vigil Sentinel service. Replies to this address are unattended.
                </p>
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
      console.error(`[SERVER ERROR] [processSwitchEscalation] Fatal error dispatching escalation to ${recipientEmail}:`, {
        switchId,
        recipientEmail,
        targetId: target.id,
        error: dispatchErr.message,
        stack: dispatchErr.stack,
      });

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