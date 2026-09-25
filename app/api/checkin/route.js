import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// GET: Validate token & return switch info for verification page
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ valid: false, error: "Missing verification token" }, { status: 400 });
  }

  const supabase = getAdminClient();

  const { data: record, error } = await supabase
    .from("checkin_tokens")
    .select(`
      id,
      expires_at,
      used_at,
      switches (
        id,
        name,
        criticality,
        purpose,
        last_check_in
      )
    `)
    .eq("token", token)
    .single();

  if (error || !record) {
    return NextResponse.json({ valid: false, error: "Invalid or expired token" }, { status: 404 });
  }

  if (record.used_at) {
    return NextResponse.json({
      valid: false,
      error: "Token has already been consumed",
      usedAt: record.used_at,
    }, { status: 410 });
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    return NextResponse.json({
      valid: false,
      error: "Token validity expired alongside switch deadline",
    }, { status: 410 });
  }

  return NextResponse.json({
    valid: true,
    switch: record.switches,
    expiresAt: record.expires_at,
  });
}

// POST: Execute the pulse and consume token
export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Fetch token
    const { data: record, error: fetchErr } = await supabase
      .from("checkin_tokens")
      .select(`
        id,
        switch_id,
        expires_at,
        used_at,
        switches (
          id,
          usr_id,
          name
        )
      `)
      .eq("token", token)
      .single();

    if (fetchErr || !record) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    if (record.used_at) {
      return NextResponse.json({ error: "Token already consumed" }, { status: 409 });
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Token expired" }, { status: 410 });
    }

    const nowIso = new Date().toISOString();

    // 2. Mark token as consumed
    await supabase
      .from("checkin_tokens")
      .update({ used_at: nowIso })
      .eq("id", record.id);

    // 3. Reset switch countdown timer
    await supabase
      .from("switches")
      .update({ last_check_in: nowIso })
      .eq("id", record.switch_id);

    // 4. Log heartbeat event in telemetry
    await supabase.from("escalation_logs").insert({
      usr_id: record.switches.usr_id,
      switch_id: record.switch_id,
      event_type: "CHECKIN_PULSE",
      channel: "EMAIL_ACTION",
      recipient_email: null,
      trust_tier: null,
      status: "SUCCESS",
      details: `Heartbeat acknowledged via single-use signed link for [${record.switches.name}].`,
    });

    return NextResponse.json({
      success: true,
      message: `Heartbeat pulsed. Switch [${record.switches.name}] countdown reset.`,
      timestamp: nowIso,
    });
  } catch (err) {
    console.error("[CheckIn API Error]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}