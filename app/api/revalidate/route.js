import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import crypto from "crypto";
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper: Calculate exact deadline from interval JSON including minutes
function getSwitchDeadline(lastCheckIn, interval) {
  const deadline = new Date(lastCheckIn);
  if (interval?.months) deadline.setMonth(deadline.getMonth() + Number(interval.months));
  if (interval?.days) deadline.setDate(deadline.getDate() + Number(interval.days));
  if (interval?.hours) deadline.setHours(deadline.getHours() + Number(interval.hours));
  if (interval?.minutes) deadline.setMinutes(deadline.getMinutes() + Number(interval.minutes));
  return deadline;
}

// Helper: Format remaining milliseconds into human-readable text
function formatRemainingDuration(ms) {
  if (ms <= 0) return "0m";
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export async function GET(request) {
  // 1. Guard route with Bearer or custom header
  const authHeader = request.headers.get("authorization");
  const cronSecret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  const isAuthorized =
    cronSecret === expectedSecret ||
    authHeader === `Bearer ${expectedSecret}`;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  // 2. Initialize Service-Role Client (bypasses RLS for system daemon)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  // 3. Fetch all active switches with relational contacts and disclosures
  const { data: switches, error: fetchErr } = await supabaseAdmin
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
      switch_contacts (
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
        contacts:target_contact_id (
          id,
          contact_name,
          email
        )
      )
    `);

  if (fetchErr) {
    console.error("[Cron Evaluator] DB query error:", fetchErr);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const now = Date.now();
  const summary = {
    evaluated: switches.length,
    warningsSent: 0,
    triggered: 0,
    dispatchesRecorded: 0,
  };

  // 4. Evaluate each switch
  for (const sw of switches) {
    if (!sw.last_check_in) continue;

    const startMs = new Date(sw.last_check_in).getTime();
    const deadline = getSwitchDeadline(sw.last_check_in, sw.check_in_interval);

    // Total lifespan of this pulse cycle in milliseconds
    const totalIntervalMs = Math.max(deadline.getTime() - startMs, 0);
    const timeLeftMs = deadline.getTime() - now;

    // Dynamic warning window: 25% of total interval
    const warningThresholdMs = totalIntervalMs * 0.25;
    const remainingText = formatRemainingDuration(timeLeftMs);

    console.log(
      `[Eval] Switch "${sw.name}" | Remaining: ${remainingText} | Warning Threshold: ${formatRemainingDuration(warningThresholdMs)}`
    );

    // ==========================================
    // CASE A: Switch has NOT tripped yet
    // ==========================================
    if (timeLeftMs > 0) {
      // Check if switch has entered its 25% warning window
      if (timeLeftMs <= warningThresholdMs) {
        // Anti-spam guard: limit(1) prevents PostgREST multiple-row exception loops
        const { data: existingWarnings } = await supabaseAdmin
          .from("escalation_logs")
          .select("id")
          .eq("switch_id", sw.id)
          .eq("event_type", "TRIP_WARNING")
          .gt("created_at", sw.last_check_in)
          .limit(1);

        if (existingWarnings && existingWarnings.length > 0) {
          console.log(`[Eval] 25% warning already logged for "${sw.name}". Skipping.`);
          continue;
        }

        // Fetch owner email from Supabase Auth
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(sw.usr_id);
        const operatorEmail = userData?.user?.email;

        // Fallback for Resend sandbox mode if operator email is not yet verified
        const recipientEmail = operatorEmail || "randomuserebay@gmail.com";

        let warningStatus = "SUCCESS";
        let warningDetails = `Switch [${sw.name}] entered final 25% window (${remainingText} remaining).`;

       // 1. Generate a cryptographic 256-bit token
        const checkinToken = crypto.randomBytes(32).toString("hex");

        // 2. Persist token bound to this switch, expiring at the exact switch deadline
        const { error: tokenErr } = await supabaseAdmin
          .from("checkin_tokens")
          .insert({
            switch_id: sw.id,
            token: checkinToken,
            expires_at: deadline.toISOString(),
          });

        if (tokenErr) {
          console.error("❌ Failed to create checkin token:", tokenErr);
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vigil-pi-fawn.vercel.app";
        const pulseActionUrl = `${appUrl}/checkin?token=${checkinToken}`;

        // 3. Dispatch Warning with One-Click Link
        if (recipientEmail) {
          const { data: resendData, error: resendError } = await resend.emails.send({
            from: "Vigil System <onboarding@resend.dev>",
            to: recipientEmail,
            subject: `[ACTION REQUIRED] Vigil Heartbeat Warning: ${sw.name}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0e14; color: #ededed; padding: 32px 24px; border-radius: 8px; max-width: 580px; margin: 0 auto; border: 1px solid #1e293b;">
                <div style="font-size: 11px; letter-spacing: 0.1em; color: #f59e0b; text-transform: uppercase; font-weight: 700; margin-bottom: 8px;">
                  ⚠️ Fail-Safe Imminent Trigger Alert
                </div>
                <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 20px;">Switch Entered Final 25% Lifespan</h2>
                <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                  Switch <strong style="color: #ffffff;">${sw.name}</strong> will trigger automated escalations unless a heartbeat pulse is acknowledged.
                </p>

                <div style="background: #111622; border: 1px solid #1e293b; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                      <td style="color: #64748b; padding: 4px 0;">Time Remaining</td>
                      <td style="color: #f59e0b; font-weight: 600; text-align: right; padding: 4px 0;">${remainingText}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; padding: 4px 0;">Criticality Tier</td>
                      <td style="color: #cbd5e1; text-align: right; padding: 4px 0;">${sw.criticality || "OPERATIONAL"}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; padding: 4px 0;">Domain Purpose</td>
                      <td style="color: #cbd5e1; text-align: right; padding: 4px 0;">${sw.purpose || "PERSONAL"}</td>
                    </tr>
                  </table>
                </div>

                <div style="text-align: center; margin-bottom: 24px;">
                  <a href="${pulseActionUrl}" style="display: inline-block; width: 100%; box-sizing: border-box; padding: 14px 20px; background-color: #0284c7; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase;">
                    Pulse Heartbeat Now
                  </a>
                </div>

                <p style="color: #64748b; font-size: 11px; text-align: center; margin: 0;">
                  This is a signed single-use action link. Clicking it opens a verification terminal without requiring manual dashboard login.
                </p>
              </div>
            `,
          });

        

          if (resendError) {
            console.error("❌ Resend Warning API Error:", resendError);
            warningStatus = "FAILED";
            warningDetails = `Warning delivery failed: ${resendError.message}`;
          } else {
            console.log("✅ Resend Warning Dispatched ID:", resendData?.id);
            summary.warningsSent += 1;
          }
        }

        // Record warning telemetry
        await supabaseAdmin.from("escalation_logs").insert({
          usr_id: sw.usr_id,
          switch_id: sw.id,
          event_type: "TRIP_WARNING",
          channel: "EMAIL",
          recipient_email: recipientEmail,
          trust_tier: null,
          status: warningStatus,
          details: warningDetails,
        });


      }
      continue;
    }

    // ==========================================
    // CASE B: Switch HAS TRIPPED (timeLeftMs <= 0)
    // ==========================================
    summary.triggered += 1;

    // Check if trip was already fired during this cycle
    const { data: existingTriggers } = await supabaseAdmin
      .from("escalation_logs")
      .select("id")
      .eq("switch_id", sw.id)
      .eq("event_type", "TRIGGER_FIRED")
      .gt("created_at", sw.last_check_in)
      .limit(1);

    if (existingTriggers && existingTriggers.length > 0) {
      continue;
    }

    // Primary trip telemetry
    await supabaseAdmin.from("escalation_logs").insert({
      usr_id: sw.usr_id,
      switch_id: sw.id,
      event_type: "TRIGGER_FIRED",
      channel: "SYSTEM",
      trust_tier: null,
      status: "SUCCESS",
      details: `Switch [${sw.name}] timer expired. Autonomous actions executing.`,
    });

    const isEmailChannelActive = sw.actions?.modules
      ? Boolean(sw.actions.modules.beacon)
      : Boolean(sw.actions?.email ?? true);

    const disclosures = sw.info_to_release || [];
    const linkedContacts = sw.switch_contacts || [];

    // Execute Clearance Engine for disclosures
    for (const info of disclosures) {
      // RULE 1: Designated Sole Recipient (-1)
      if (info.trust_required === -1) {
        const target = info.contacts;
        if (target?.email && isEmailChannelActive) {
          const { data: resendData, error: resendError } = await resend.emails.send({
            from: "Vigil System <onboarding@resend.dev>",
            to: target.email,
            subject: `[DISCLOSURE] Fail-Safe Activated: ${sw.name}`,
            html: `
              <h2>Vigil Fail-Safe Protocol Executed</h2>
              <p>You have been designated as the sole recipient for confidential instructions from switch <strong>${sw.name}</strong>.</p>
              <hr />
              <p><strong>Payload:</strong></p>
              <pre style="background: #111; color: #eee; padding: 15px; border-radius: 6px;">${info.content}</pre>
            `,
          });

          await supabaseAdmin.from("escalation_logs").insert({
            usr_id: sw.usr_id,
            switch_id: sw.id,
            event_type: "PAYLOAD_DISPATCHED",
            channel: "EMAIL",
            recipient_email: target.email,
            trust_tier: -1,
            status: resendError ? "FAILED" : "SUCCESS",
            details: resendError
              ? `Delivery failed: ${resendError.message}`
              : `Delivered targeted exception payload directly to ${target.contact_name}.`,
          });
          summary.dispatchesRecorded += 1;
        }
      }
      // RULE 2: Tiered Trust Broadcast (>= 25, 50, 75)
      else {
        const eligibleContacts = linkedContacts
          .filter((sc) => sc.trust_score >= info.trust_required && sc.contacts?.email)
          .sort((a, b) => b.priority_score - a.priority_score);

        for (const sc of eligibleContacts) {
          let emailStatus = "SUCCESS";
          let emailError = null;

          if (isEmailChannelActive) {
            const { error: resendError } = await resend.emails.send({
              from: "Vigil System <onboarding@resend.dev>",
              to: sc.contacts.email,
              subject: `[ALERT] Fail-Safe Disclosure Tier ${info.trust_required}: ${sw.name}`,
              html: `
                <h2>Vigil Fail-Safe Protocol Executed</h2>
                <p>Dear ${sc.contacts.contact_name},</p>
                <p>You are receiving this automated transmission because switch <strong>${sw.name}</strong> has tripped, and your clearance rating (${sc.trust_score}) meets Tier ${info.trust_required}.</p>
                <hr />
                <p><strong>Decrypted Payload:</strong></p>
                <pre style="background: #111; color: #eee; padding: 15px; border-radius: 6px;">${info.content}</pre>
              `,
            });

            if (resendError) {
              emailStatus = "FAILED";
              emailError = resendError.message;
            }
          }

          await supabaseAdmin.from("escalation_logs").insert({
            usr_id: sw.usr_id,
            switch_id: sw.id,
            event_type: "PAYLOAD_DISPATCHED",
            channel: isEmailChannelActive ? "EMAIL" : "INTERNAL",
            recipient_email: sc.contacts.email,
            trust_tier: info.trust_required,
            status: emailStatus,
            details: emailError
              ? `Delivery failed: ${emailError}`
              : `Delivered Tier ${info.trust_required} payload to ${sc.contacts.contact_name}.`,
          });
          summary.dispatchesRecorded += 1;
        }
      }
    }
  }

  // 5. Autonomic summary return outside the evaluation loop
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    summary,
  });
}