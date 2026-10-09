import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import { getValidGoogleAccessToken } from "@/app/lib/google-drive";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    console.error("[SERVER ERROR] [GET /api/drive/files] Unauthorized access attempt:", {
      authError: authErr?.message,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Fetch refreshed Google Access Token
  const accessToken = await getValidGoogleAccessToken(supabase, user.id);

  if (!accessToken) {
    console.error("[SERVER ERROR] [GET /api/drive/files] Google Drive integration missing or refresh token failed:", {
      userId: user.id,
    });
    return NextResponse.json(
      { error: "GOOGLE_NOT_CONNECTED", message: "Google Drive is not linked or needs reconnection." },
      { status: 403 }
    );
  }

  // 2. Parse query search string (optional filter)
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q") || "";

  let query = "trashed = false and mimeType != 'application/vnd.google-apps.folder'";
  if (search.trim()) {
    query += ` and name contains '${search.replace(/'/g, "\\'")}'`;
  }

  try {
    const driveParams = new URLSearchParams({
      q: query,
      pageSize: "30",
      fields: "files(id, name, mimeType, iconLink, webViewLink, size, modifiedTime)",
      orderBy: "modifiedTime desc",
    });

    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files?${driveParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await driveRes.json();

    if (!driveRes.ok) {
      console.error("[SERVER ERROR] [GET /api/drive/files] Google Drive API returned non-200 status:", {
        status: driveRes.status,
        statusText: driveRes.statusText,
        error: data.error,
        userId: user.id,
      });
      return NextResponse.json({ error: data.error?.message || "Failed to query Drive." }, { status: driveRes.status });
    }

    return NextResponse.json({ files: data.files || [] });
  } catch (err) {
    console.error("[SERVER ERROR] [GET /api/drive/files] Fatal exception while querying Google Drive API:", {
      userId: user.id,
      error: err.message,
      stack: err.stack,
    });
    return NextResponse.json({ error: "Internal server error fetching Drive files." }, { status: 500 });
  }
}