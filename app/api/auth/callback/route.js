import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  console.log(request);
  
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (error || !code) {
    console.error("[Google OAuth Callback] Error or denied:", error);
    return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(error || "access_denied")}`, appUrl));
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    console.error("[Google OAuth Callback] Active session missing:", userErr);
    return NextResponse.redirect(new URL("/login?error=session_expired", appUrl));
  }

  if (user.id !== state) {
    console.error("[Google OAuth Callback] State CSRF mismatch. Expected:", user.id, "Received:", state);
    return NextResponse.redirect(new URL("/dashboard?error=csrf_mismatch", appUrl));
  }

  try {
    // 1. Exchange code for access & refresh tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI, // Must match the initiate step exactly
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

    // 2. Fetch Google account email
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
      console.warn("[Google OAuth Callback] Profile lookup failed:", e);
    }

    // 3. Prepare upsert data (safeguards refresh_token if Google skips it on re-consent)
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    const upsertData = {
      usr_id: user.id,
      provider: "google_drive",
      access_token: tokens.access_token,
      token_expiry: expiresAt,
      scopes: tokens.scope ? tokens.scope.split(" ") : [],
      account_email: accountEmail,
      updated_at: new Date().toISOString(),
    };

    if (tokens.refresh_token) {
      upsertData.refresh_token = tokens.refresh_token;
    }

    const { error: dbError } = await supabase
      .from("user_integrations")
      .upsert(upsertData, { onConflict: "usr_id, provider" });

    if (dbError) {
      console.error("[Google OAuth Callback] DB save error:", dbError);
      return NextResponse.redirect(new URL("/dashboard?error=db_error", appUrl));
    }

    return NextResponse.redirect(new URL("/dashboard?integration=google_connected", appUrl));
  } catch (err) {
    console.error("[Google OAuth Callback] Fatal execution failure:", err);
    return NextResponse.redirect(new URL("/dashboard?error=server_error", appUrl));
  }
}