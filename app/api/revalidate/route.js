import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import crypto from "crypto";
import { processSwitchEscalation } from "@/app/lib/escalations";

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
    console.error("[SERVER ERROR] [GET /api/revalidate] Unauthorized cron daemon request:", {
      hasCronSecret: Boolean(cronSecret),
      hasAuthHeader: Boolean(authHeader),
    });
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  // 2. Initialize Service-Role Client (bypasses RLS for system daemon)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const now = Date.now();
  const newlyTrippedIds = new Set();
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
    console.error("[SERVER ERROR] [GET /api/revalidate] Database query error for ARMED switches:", {
      error: armedErr.message,
      details: armedErr.details,
      code: armedErr.code,
    });
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
        const { data: existingWarnings, error: warnCheckErr } = await supabaseAdmin
          .from("escalation_logs")
          .select("id")
          .eq("switch_id", sw.id)
          .eq("event_type", "TRIP_WARNING")
          .gt("created_at", sw.last_check_in)
          .limit(1);

        if (warnCheckErr) {
          console.error("[SERVER ERROR] [GET /api/revalidate] Failed querying existing trip warnings:", {
            switchId: sw.id,
            error: warnCheckErr.message,
          });
        }

        if (existingWarnings && existingWarnings.length > 0) {
          continue;
        }

        // Fetch owner email from Supabase Auth
        const { data: userData, error: userLookupErr } = await supabaseAdmin.auth.admin.getUserById(sw.usr_id);
        if (userLookupErr) {
          console.error("[SERVER ERROR] [GET /api/revalidate] Failed looking up owner email for warning:", {
            switchId: sw.id,
            userId: sw.usr_id,
            error: userLookupErr.message,
          });
        }
        const recipientEmail = userData?.user?.email;

        // Generate one-click signed verification token
        const checkinToken = crypto.randomBytes(32).toString("hex");

        const { error: tokenInsertErr } = await supabaseAdmin.from("checkin_tokens").insert({
          switch_id: sw.id,
          token: checkinToken,
          expires_at: deadline.toISOString(),
        });

        if (tokenInsertErr) {
          console.error("[SERVER ERROR] [GET /api/revalidate] Failed saving checkin_tokens row:", {
            switchId: sw.id,
            error: tokenInsertErr.message,
          });
        }

        const appUrl =
          process.env.NEXT_PUBLIC_SITE_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          "http://localhost:3000";
        const pulseActionUrl = `${appUrl}/checkin?token=${checkinToken}`;

        let warningStatus = "SUCCESS";
        let warningDetails = `Switch [${sw.name}] entered final 25% window (${remainingText} remaining).`;

        if (recipientEmail) {
          const { error: resendError } = await resend.emails.send({
            from: "Vigil System <onboarding@resend.dev>",
            to: recipientEmail,
            subject: `Vigil Heartbeat Notice: ${sw.name}`,
            html: `
              <div style="background-color: #f8fafc; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px;">
                <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                  <div style="font-size: 11px; letter-spacing: 0.08em; color: #ff3b19; text-transform: uppercase; font-weight: 700; margin-bottom: 8px;">
                    Operator Heartbeat Required
                  </div>
                  <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">
                    Switch Approaching Verification Deadline
                  </h2>
                  <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                    Switch <strong>${sw.name}</strong> has entered its final verification window. Without an operator pulse confirmation, fail-safe procedures and designated automated actions will initiate upon expiration.
                  </p>

                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                      <tr>
                        <td style="color: #64748b; padding: 6px 0; font-weight: 500;">Time Remaining</td>
                        <td style="color: #ff3b19; font-weight: 700; text-align: right; padding: 6px 0; font-family: 'SFMono-Regular', Consolas, monospace;">${remainingText}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; padding: 6px 0; font-weight: 500;">Criticality Tier</td>
                        <td style="color: #0f172a; text-align: right; padding: 6px 0; font-weight: 600;">${sw.criticality || "OPERATIONAL"}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; padding: 6px 0; font-weight: 500;">Domain Purpose</td>
                        <td style="color: #0f172a; text-align: right; padding: 6px 0; font-weight: 600;">${sw.purpose || "PERSONAL"}</td>
                      </tr>
                    </table>
                  </div>

                  <div style="text-align: center; margin-bottom: 24px;">
                    <a href="${pulseActionUrl}" style="display: inline-block; width: 100%; box-sizing: border-box; padding: 14px 20px; background-color: #ff3b19; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase;">
                      Confirm Operator Pulse Now
                    </a>
                  </div>

                  <div style="padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center;">
                    <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.5;">
                      This notification contains a secure single-use authentication link. Selecting the action confirms your operator status directly without manual credential entry.
                    </p>
                  </div>
                </div>
              </div>
            `,
          });

          if (resendError) {
            console.error("[SERVER ERROR] [GET /api/revalidate] Resend email warning dispatch failed:", {
              switchId: sw.id,
              recipient: recipientEmail,
              error: resendError.message,
            });
            warningStatus = "FAILED";
            warningDetails = `Warning delivery failed: ${resendError.message}`;
          } else {
            summary.warningsSent += 1;
          }
        }

        const { error: logErr } = await supabaseAdmin.from("escalation_logs").insert({
          usr_id: sw.usr_id,
          switch_id: sw.id,
          event_type: "TRIP_WARNING",
          channel: "EMAIL",
          recipient_email: recipientEmail,
          trust_tier: null,
          status: warningStatus,
          details: warningDetails,
        });

        if (logErr) {
          console.error("[SERVER ERROR] [GET /api/revalidate] Failed recording TRIP_WARNING log:", {
            switchId: sw.id,
            error: logErr.message,
          });
        }
      }
      continue;
    }

    // -----------------------------------------------------------
    // CASE B: Switch HAS TRIPPED (timeLeftMs <= 0)
    // -----------------------------------------------------------
    summary.newlyTripped += 1;
    newlyTrippedIds.add(sw.id);

    // Transition switch to ESCALATING status
    const { error: tripUpdateErr } = await supabaseAdmin
      .from("switches")
      .update({ status: "ESCALATING" })
      .eq("id", sw.id);

    if (tripUpdateErr) {
      console.error("[SERVER ERROR] [GET /api/revalidate] Failed transitioning switch to ESCALATING:", {
        switchId: sw.id,
        error: tripUpdateErr.message,
      });
    }

    // Primary trip telemetry
    const { error: tripLogErr } = await supabaseAdmin.from("escalation_logs").insert({
      usr_id: sw.usr_id,
      switch_id: sw.id,
      event_type: "TRIGGER_FIRED",
      channel: "SYSTEM",
      trust_tier: null,
      status: "SUCCESS",
      details: `Countdown reached 0. Switch ${sw.name} transitioned to ESCALATING. Initializing priority waterfall.`,
    });

    if (tripLogErr) {
      console.error("[SERVER ERROR] [GET /api/revalidate] Failed logging TRIGGER_FIRED event:", {
        switchId: sw.id,
        error: tripLogErr.message,
      });
    }

    // Fire top-priority tier batch dispatch
    try {
      await processSwitchEscalation(supabaseAdmin, { ...sw, status: "ESCALATING" });
    } catch (escErr) {
      console.error("[SERVER ERROR] [GET /api/revalidate] Exception executing processSwitchEscalation on tripped switch:", {
        switchId: sw.id,
        error: escErr.message,
        stack: escErr.stack,
      });
    }
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

  if (escErr) {
    console.error("[SERVER ERROR] [GET /api/revalidate] Error querying ESCALATING switches:", {
      error: escErr.message,
      details: escErr.details,
    });
  } else if (escalatingSwitches) {
    summary.escalatingEvaluated = escalatingSwitches.length;

    for (const sw of escalatingSwitches) {
      if (newlyTrippedIds.has(sw.id)) {
        // Skip switch already processed upon initial trip in Phase 1 of this cycle
        continue;
      }

      try {
        await processSwitchEscalation(supabaseAdmin, sw);
      } catch (cascadeErr) {
        console.error("[SERVER ERROR] [GET /api/revalidate] Exception processing cascading switch escalation:", {
          switchId: sw.id,
          error: cascadeErr.message,
          stack: cascadeErr.stack,
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    summary,
  });
}