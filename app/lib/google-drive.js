/**
 * Retrieves a valid access token for a given user.
 * If the current access token is expired, it uses the refresh_token to obtain a new one.
 */
export async function getValidGoogleAccessToken(supabase, userId) {
  const { data: integration, error } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("usr_id", userId)
    .eq("provider", "google_drive")
    .single();

  if (error || !integration || !integration.refresh_token) {
    return null;
  }

  const isExpired =
    !integration.token_expiry ||
    new Date(integration.token_expiry).getTime() - Date.now() < 60 * 1000; // 1-minute buffer

  if (!isExpired && integration.access_token) {
    return integration.access_token;
  }

  // Refresh the token
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: integration.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const refreshed = await res.json();

    if (!res.ok || refreshed.error) {
      console.error("[Google Token Refresh] Error:", refreshed);
      return null;
    }

    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

    await supabase
      .from("user_integrations")
      .update({
        access_token: refreshed.access_token,
        token_expiry: newExpiry,
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    return refreshed.access_token;
  } catch (err) {
    console.error("[Google Token Refresh] Fatal:", err);
    return null;
  }
}

/**
 * Grants reader permissions on a Drive file to a specific recipient email.
 */
export async function grantDriveFileAccess(accessToken, fileId, recipientEmail) {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?sendNotificationEmail=false`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "reader",
          type: "user",
          emailAddress: recipientEmail,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.warn(`[Drive Share] Failed to share file ${fileId} with ${recipientEmail}:`, data);
      return { success: false, error: data.error?.message };
    }

    return { success: true, permissionId: data.id };
  } catch (err) {
    console.error(`[Drive Share Fatal] Exception sharing file ${fileId}:`, err);
    return { success: false, error: err.message };
  }
}