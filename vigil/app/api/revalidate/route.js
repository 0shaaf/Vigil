import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Helper: Calculate exact deadline from interval JSON
function getSwitchDeadline(lastCheckIn, interval) {
  const deadline = new Date(lastCheckIn);
  if (interval?.months) deadline.setMonth(deadline.getMonth() + Number(interval.months));
  if (interval?.days) deadline.setDate(deadline.getDate() + Number(interval.days));
  if (interval?.hours) deadline.setHours(deadline.getHours() + Number(interval.hours));
  return deadline;
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
    triggered: 0,
    dispatchesRecorded: 0,
  };

  // 4. Evaluate each switch
  for (const sw of switches) {
    if (!sw.last_check_in) continue;

    const deadline = getSwitchDeadline(sw.last_check_in, sw.check_in_interval);
    const timeLeftMs = deadline.getTime() - now;

    // A. Switch has NOT tripped
    if (timeLeftMs > 0) {
      const hoursLeft = timeLeftMs / (1000 * 60 * 60);

      // Warning window: between 0 and 2 hours left
      if (hoursLeft <= 2) {
        // Record trip warning telemetry
        await supabaseAdmin.from("escalation_logs").insert({
          usr_id: sw.usr_id,
          switch_id: sw.id,
          event_type: "TRIP_WARNING",
          channel: "INTERNAL",
          trust_tier: null,
          status: "SUCCESS",
          details: `Switch [${sw.name}] is within ${hoursLeft.toFixed(1)}h of expiration.`,
        });
      }
      continue;
    }

    // B. Switch HAS TRIPPED (timeLeftMs <= 0)
    summary.triggered += 1;

    // Check if this switch was already triggered to avoid spam loops
    const { data: existingTrigger } = await supabaseAdmin
      .from("escalation_logs")
      .select("id")
      .eq("switch_id", sw.id)
      .eq("event_type", "TRIGGER_FIRED")
      .gt("created_at", sw.last_check_in)
      .maybeSingle();

    if (existingTrigger) {
      // Already triggered for this pulse cycle; skip to prevent re-sending
      continue;
    }

    // Log the primary trigger event
    await supabaseAdmin.from("escalation_logs").insert({
      usr_id: sw.usr_id,
      switch_id: sw.id,
      event_type: "TRIGGER_FIRED",
      channel: "SYSTEM",
      trust_tier: null,
      status: "SUCCESS",
      details: `Switch [${sw.name}] timer expired. Initiating payload distribution.`,
    });

    // 5. Run the Clearance Engine for all disclosures (info_to_release)
    const disclosures = sw.info_to_release || [];
    const linkedContacts = sw.switch_contacts || [];

    for (const info of disclosures) {
      // RULE 1: Specific Contact Exception (-1)
      if (info.trust_required === -1) {
        const target = info.contacts; // Joined via target_contact_id
        if (target?.email) {
          // Log dispatch
          await supabaseAdmin.from("escalation_logs").insert({
            usr_id: sw.usr_id,
            switch_id: sw.id,
            event_type: "PAYLOAD_DISPATCHED",
            channel: sw.actions?.email ? "EMAIL" : "INTERNAL",
            recipient_email: target.email,
            trust_tier: -1,
            status: "SUCCESS",
            details: `Delivered targeted exception payload directly to ${target.contact_name}.`,
          });
          summary.dispatchesRecorded += 1;
        }
      } 
      // RULE 2: Tiered Trust Broadcast (>= 25, 50, 75)
      else {
        // Find all contacts who meet or exceed the clearance score
        const eligibleContacts = linkedContacts
          .filter((sc) => sc.trust_score >= info.trust_required && sc.contacts?.email)
          .sort((a, b) => b.priority_score - a.priority_score); // Sort by escalation priority

        for (const sc of eligibleContacts) {
          await supabaseAdmin.from("escalation_logs").insert({
            usr_id: sw.usr_id,
            switch_id: sw.id,
            event_type: "PAYLOAD_DISPATCHED",
            channel: sw.actions?.email ? "EMAIL" : "INTERNAL",
            recipient_email: sc.contacts.email,
            trust_tier: info.trust_required,
            status: "SUCCESS",
            details: `Delivered Tier ${info.trust_required} payload to ${sc.contacts.contact_name} (Trust: ${sc.trust_score}, Priority: ${sc.priority_score}).`,
          });
          summary.dispatchesRecorded += 1;
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    summary,
  });
}