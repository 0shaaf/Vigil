import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import crypto from "crypto";
import { processSwitchEscalation } from "@/app/lib/escalation";

export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper: Calculate exact deadline timestamp from interval JSON
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
  // 1. Guard route with Bearer or custom header (allows dev access if CRON_SECRET is not set)
  const authHeader = request.headers.get("authorization");
  const cronSecret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  const isAuthorized =
    !expectedSecret ||
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

  const now = Date.now();
  const summary = {
    armedEvaluated: 0,
    warningsSent: 0,
    newlyTripped: 0,
    escalatingEvaluated: 0,
  };

  // =============================================================
  // PHASE 1: Countdown Evaluation for ARMED Switches
  // =============================================================
  const { data: armedSwitches, error: armedErr } = await supabaseAdmin
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
      actions
    `)
    .eq("status", "ARMED");

  if (armedErr) {
    console.error("[Cron Evaluator] Query error (ARMED switches):", armedErr);
    return NextResponse.json({ error: armedErr.message }, { status: 500 });
  }

  summary.armedEvaluated = armedSwitches?.length || 0;

  for (const sw of armedSwitches || []) {
    if (!sw.last_check_in) continue;

    const startMs = new Date(sw.last_check_in).getTime();
    const deadline = getSwitchDeadline(sw.last_check_in, sw.check_in_interval);
    const totalIntervalMs = Math.max(deadline.getTime() - startMs, 0);
    const timeLeftMs = deadline.getTime() - now;
    const remainingText = formatRemainingDuration(timeLeftMs);

    // Dynamic warning window: 25% of total interval
    const warningThresholdMs = totalIntervalMs * 0.25;

    // -----------------------------------------------------------
    // CASE A: Switch is still active (timeLeftMs > 0)
    // -----------------------------------------------------------
    if (timeLeftMs > 0) {
      if (timeLeftMs <= warningThresholdMs) {
        // Anti-spam guard: limit(1) prevents multiple warnings per pulse cycle
        const { data: existingWarnings } = await supabaseAdmin
          .from("escalation_logs")
          .select("id")
          .eq("switch_id", sw.id)
          .eq("event_type", "TRIP_WARNING")
          .gt("created_at", sw.last_check_in)
          .limit(1);

        if (existingWarnings && existingWarnings.length > 0) {
          continue;
        }

        // Fetch owner email from Supabase Auth
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(sw.usr_id);
        const recipientEmail = userData?.user?.email;

        // Generate one-click signed verification token
        const checkinToken = crypto.randomBytes(32).toString("hex");

        await supabaseAdmin.from("checkin_tokens").insert({
          switch_id: sw.id,
          token: checkinToken,
          expires_at: deadline.toISOString(),
        });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const pulseActionUrl = `${appUrl}/checkin?token=${checkinToken}`;

        let warningStatus = "SUCCESS";
        let warningDetails = `Switch [${sw.name}] entered final 25% window (${remainingText} remaining).`;

        if (recipientEmail) {
          const { error: resendError } = await resend.emails.send({
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
            console.error("[Cron Warning] Resend Error:", resendError);
            warningStatus = "FAILED";
            warningDetails = `Warning delivery failed: ${resendError.message}`;
          } else {
            summary.warningsSent += 1;
          }
        }

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

    // -----------------------------------------------------------
    // CASE B: Switch HAS TRIPPED (timeLeftMs <= 0)
    // -----------------------------------------------------------
    summary.newlyTripped += 1;

    // Transition switch to ESCALATING status
    await supabaseAdmin
      .from("switches")
      .update({ status: "ESCALATING" })
      .eq("id", sw.id);

    // Primary trip telemetry
    await supabaseAdmin.from("escalation_logs").insert({
      usr_id: sw.usr_id,
      switch_id: sw.id,
      event_type: "TRIGGER_FIRED",
      channel: "SYSTEM",
      trust_tier: null,
      status: "SUCCESS",
      details: `Countdown reached 0. Switch ${sw.name} transitioned to ESCALATING. Initializing priority waterfall.`,
    });

    // Fire top-priority tier batch dispatch
    await processSwitchEscalation(supabaseAdmin, { ...sw, status: "ESCALATING" });
  }

  // =============================================================
  // PHASE 2: Waterfall Timeout & Cascade for ESCALATING Switches
  // =============================================================
  const { data: escalatingSwitches, error: escErr } = await supabaseAdmin
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
      actions
    `)
    .eq("status", "ESCALATING");

  if (!escErr && escalatingSwitches) {
    summary.escalatingEvaluated = escalatingSwitches.length;

    for (const sw of escalatingSwitches) {
      await processSwitchEscalation(supabaseAdmin, sw);
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    summary,
  });
}