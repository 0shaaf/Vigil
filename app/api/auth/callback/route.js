import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error || !code) {
    console.error("[Google OAuth Callback] Error returned:", error);
    return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(error || "access_denied")}`, appUrl));
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== state) {
    return NextResponse.redirect(new URL("/dashboard?error=auth_mismatch", appUrl));
  }

  try {
    // 1. Exchange authorization code for OAuth tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok || tokens.error) {
      console.error("[Google OAuth Callback] Token exchange failed:", tokens);
      return NextResponse.redirect(
        new URL(`/dashboard?error=${encodeURIComponent(tokens.error_description || tokens.error)}`, appUrl)
      );
    }

    // 2. Fetch the connected Google account's email
    let accountEmail = null;
    try {
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        accountEmail = profile.email;
      }
    } catch (e) {
      console.warn("[Google OAuth Callback] Could not fetch profile email:", e);
    }

    // 3. Upsert integration into user_integrations
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    const upsertPayload = {
      usr_id: user.id,
      provider: "google_drive",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token, // Guaranteed by prompt=consent
      token_expiry: expiresAt,
      scopes: tokens.scope ? tokens.scope.split(" ") : [],
      account_email: accountEmail,
      updated_at: new Date().toISOString(),
    };

    const { error: dbError } = await supabase
      .from("user_integrations")
      .upsert(upsertPayload, { onConflict: "usr_id, provider" });

    if (dbError) {
      console.error("[Google OAuth Callback] DB error saving integration:", dbError);
      return NextResponse.redirect(new URL("/dashboard?error=db_save_failed", appUrl));
    }

    return NextResponse.redirect(new URL("/dashboard?integration=google_connected", appUrl));
  } catch (err) {
    console.error("[Google OAuth Callback] Fatal execution error:", err);
    return NextResponse.redirect(new URL("/dashboard?error=server_error", appUrl));
  }
}