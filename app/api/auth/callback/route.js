import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (error || !code) {
    console.error("[SERVER ERROR] [GET /api/auth/callback] OAuth authorization error or code missing:", {
      error,
      hasCode: Boolean(code),
      state,
    });
    return NextResponse.redirect(new URL(`/dashboard/drive?error=${encodeURIComponent(error || "access_denied")}`, appUrl));
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    console.error("[SERVER ERROR] [GET /api/auth/callback] Active user session missing or invalid:", {
      authError: userErr?.message,
      hasUser: Boolean(user),
    });
    return NextResponse.redirect(new URL("/login?error=session_expired", appUrl));
  }

  if (user.id !== state) {
    console.error("[SERVER ERROR] [GET /api/auth/callback] State CSRF mismatch:", {
      expectedUserId: user.id,
      receivedState: state,
    });
    return NextResponse.redirect(new URL("/dashboard/drive?error=csrf_mismatch", appUrl));
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
      console.error("[SERVER ERROR] [GET /api/auth/callback] Token exchange with Google OAuth failed:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: tokens.error,
        errorDescription: tokens.error_description,
      });
      return NextResponse.redirect(
        new URL(`/dashboard/drive?error=${encodeURIComponent(tokens.error_description || tokens.error)}`, appUrl)
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
      console.error("[SERVER ERROR] [GET /api/auth/callback] Database error saving user_integrations token:", {
        userId: user.id,
        error: dbError.message,
        details: dbError.details,
      });
      return NextResponse.redirect(new URL("/dashboard/drive?error=db_error", appUrl));
    }

    return NextResponse.redirect(new URL("/dashboard/drive?integration=google_connected", appUrl));
  } catch (err) {
    console.error("[SERVER ERROR] [GET /api/auth/callback] Fatal exception during OAuth token exchange:", {
      message: err.message,
      stack: err.stack,
    });
    return NextResponse.redirect(new URL("/dashboard/drive?error=server_error", appUrl));
  }
}