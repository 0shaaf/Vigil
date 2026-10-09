import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin-client";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { valid: false, error: "Missing authorization token parameter." },
      { status: 400 }
    );
  }

  try {
    const supabaseAdmin = createSupabaseAdminClient();

    const { data: tokenRecord, error: tokenErr } = await supabaseAdmin
      .from("checkin_tokens")
      .select(`
        id,
        token,
        switch_id,
        expires_at,
        switches (
          id,
          usr_id,
          name,
          criticality,
          purpose,
          status,
          last_check_in,
          check_in_interval
        )
      `)
      .eq("token", token)
      .maybeSingle();

    if (tokenErr) {
      console.error("[SERVER ERROR] [GET /api/checkin] Error querying checkin_tokens:", {
        token,
        error: tokenErr.message,
      });
      return NextResponse.json(
        { valid: false, error: "Failed to verify token signature." },
        { status: 500 }
      );
    }

    if (!tokenRecord || !tokenRecord.switches) {
      return NextResponse.json(
        { valid: false, error: "Authorization token not found or already invalidated." },
        { status: 404 }
      );
    }

    // Check expiration
    if (tokenRecord.expires_at && new Date(tokenRecord.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { valid: false, error: "This heartbeat authorization token has expired." },
        { status: 410 }
      );
    }

    // Check switch status
    if (tokenRecord.switches.status !== "ARMED") {
      return NextResponse.json(
        {
          valid: false,
          error: `Switch is in ${tokenRecord.switches.status} status and cannot receive heartbeat pulses.`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      switch: {
        id: tokenRecord.switches.id,
        name: tokenRecord.switches.name,
        criticality: tokenRecord.switches.criticality,
        purpose: tokenRecord.switches.purpose,
        last_check_in: tokenRecord.switches.last_check_in,
        check_in_interval: tokenRecord.switches.check_in_interval,
      },
      expiresAt: tokenRecord.expires_at,
    });
  } catch (err) {
    console.error("[SERVER ERROR] [GET /api/checkin] Unhandled exception:", err);
    return NextResponse.json(
      { valid: false, error: "Internal server error during token verification." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const token = body?.token;

    if (!token) {
      return NextResponse.json(
        { error: "Missing authorization token in request body." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: tokenRecord, error: tokenErr } = await supabaseAdmin
      .from("checkin_tokens")
      .select(`
        id,
        token,
        switch_id,
        expires_at,
        switches (
          id,
          usr_id,
          name,
          criticality,
          purpose,
          status,
          last_check_in,
          check_in_interval
        )
      `)
      .eq("token", token)
      .maybeSingle();

    if (tokenErr) {
      console.error("[SERVER ERROR] [POST /api/checkin] Error querying checkin_tokens:", {
        token,
        error: tokenErr.message,
      });
      return NextResponse.json(
        { error: "Failed to verify token signature." },
        { status: 500 }
      );
    }

    if (!tokenRecord || !tokenRecord.switches) {
      return NextResponse.json(
        { error: "Authorization token not found or already invalidated." },
        { status: 404 }
      );
    }

    // Check expiration
    if (tokenRecord.expires_at && new Date(tokenRecord.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Heartbeat authorization token has expired." },
        { status: 410 }
      );
    }

    // Check switch status
    if (tokenRecord.switches.status !== "ARMED") {
      return NextResponse.json(
        {
          error: `Switch is in ${tokenRecord.switches.status} status and cannot receive heartbeat pulses.`,
        },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    // 1. Update switch heartbeat
    const { error: updateErr } = await supabaseAdmin
      .from("switches")
      .update({ last_check_in: nowIso })
      .eq("id", tokenRecord.switch_id);

    if (updateErr) {
      console.error("[SERVER ERROR] [POST /api/checkin] Failed updating switch last_check_in:", {
        switchId: tokenRecord.switch_id,
        error: updateErr.message,
      });
      return NextResponse.json(
        { error: "Database error updating sentinel heartbeat." },
        { status: 500 }
      );
    }

    // 2. Invalidate used token
    const { error: deleteErr } = await supabaseAdmin
      .from("checkin_tokens")
      .delete()
      .eq("token", token);

    if (deleteErr) {
      console.error("[SERVER ERROR] [POST /api/checkin] Failed invalidating used token:", {
        token,
        error: deleteErr.message,
      });
    }

    // 3. Log pulse in escalation_logs
    const { error: logErr } = await supabaseAdmin.from("escalation_logs").insert({
      usr_id: tokenRecord.switches.usr_id,
      switch_id: tokenRecord.switch_id,
      event_type: "CHECKIN_PULSE",
      channel: "EMAIL_LINK",
      status: "SUCCESS",
      details: `Operator pulsed switch "${tokenRecord.switches.name}" via email authorization link. Countdown reset.`,
      execution_metadata: { checkin_token: token },
    });

    if (logErr) {
      console.error("[SERVER ERROR] [POST /api/checkin] Failed recording escalation log for pulse:", {
        switchId: tokenRecord.switch_id,
        error: logErr.message,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: nowIso,
    });
  } catch (err) {
    console.error("[SERVER ERROR] [POST /api/checkin] Unhandled exception:", err);
    return NextResponse.json(
      { error: "Internal server error during heartbeat transmission." },
      { status: 500 }
    );
  }
}
