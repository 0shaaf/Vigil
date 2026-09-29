/**
 * Dispatches an automated outbound kill-switch webhook when a switch trips.
 * Ensures strict idempotency so the webhook fires exactly once per escalation cycle.
 */
export async function executeLockdownWebhook(supabase, sw) {
  const config = sw.actions?.lockdown_config;
  const isEnabled = Boolean(sw.actions?.modules?.lockdown);

  // 1. Guard checks: module enabled, URL present, and not already executed
  if (!isEnabled || !config?.webhook_url?.trim() || sw.actions?.lockdown_executed) {
    return { skipped: true };
  }

  const method = (config.http_method || "POST").toUpperCase();
  const url = config.webhook_url.trim();

  // 2. Parse payload JSON with fallback
  let payloadBody = {};
  if (config.payload_json?.trim()) {
    try {
      payloadBody = JSON.parse(config.payload_json);
    } catch (parseErr) {
      console.warn("[Lockdown Webhook] JSON parse error, forwarding raw string:", parseErr);
      payloadBody = { raw_payload: config.payload_json };
    }
  }

  // Inject Vigil sentinel telemetry
  const enrichedPayload = {
    ...payloadBody,
    _vigil_event: {
      switch_id: sw.id,
      switch_name: sw.name,
      criticality: sw.criticality,
      triggered_at: new Date().toISOString(),
    },
  };

  // 3. Request headers
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "Vigil-Sentinel/1.0 (+https://vigil.sentinel)",
  };

  if (config.auth_header?.trim()) {
    headers["Authorization"] = config.auth_header.trim();
  }

  // 4. Mark switch as executed upfront to prevent race conditions
  const updatedActions = {
    ...sw.actions,
    lockdown_executed: true,
    lockdown_executed_at: new Date().toISOString(),
  };

  await supabase
    .from("switches")
    .update({ actions: updatedActions })
    .eq("id", sw.id);

  sw.actions = updatedActions;

  // 5. Fire HTTP request with 10s timeout
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method !== "GET" && method !== "HEAD" ? JSON.stringify(enrichedPayload) : undefined,
      signal: AbortSignal.timeout(10000),
    });

    const responseText = await response.text();
    const isSuccess = response.ok;

    await supabase.from("escalation_logs").insert({
      usr_id: sw.usr_id,
      switch_id: sw.id,
      event_type: "LOCKDOWN_WEBHOOK",
      channel: "WEBHOOK",
      status: isSuccess ? "SUCCESS" : "FAILED",
      details: `Dispatched ${method} to ${url}. Status: ${response.status} ${response.statusText}`,
      execution_metadata: {
        method,
        url,
        status_code: response.status,
        response_preview: responseText.slice(0, 500),
      },
    });

    return { success: isSuccess, status: response.status };
  } catch (err) {
    console.error(`[Lockdown Webhook Error] Failed to hit ${url}:`, err);

    await supabase.from("escalation_logs").insert({
      usr_id: sw.usr_id,
      switch_id: sw.id,
      event_type: "LOCKDOWN_WEBHOOK",
      channel: "WEBHOOK",
      status: "FAILED",
      details: `Network or timeout exception hitting ${url}: ${err.message}`,
      execution_metadata: { method, url, error: err.message },
    });

    return { success: false, error: err.message };
  }
}