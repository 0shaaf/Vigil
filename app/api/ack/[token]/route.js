import { createSupabaseAdminClient } from "@/app/lib/supabase/admin-client";

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const token = resolvedParams?.token;

  if (!token) {
    console.error("[SERVER ERROR] [GET /api/ack/[token]] Request missing acknowledgment token parameter.");
    return new Response(renderHtml("Error", "Missing or invalid acknowledgment token.", false), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const supabase = createSupabaseAdminClient();

  // 1. Look up contact row by acknowledgment token
  const { data: sc, error: scErr } = await supabase
    .from("switch_contacts")
    .select(`
      id,
      switch_id,
      status,
      contacts (
        id,
        contact_name,
        email
      ),
      switches (
        id,
        name,
        usr_id
      )
    `)
    .eq("ack_token", token)
    .single();

  if (scErr || !sc) {
    console.error("[SERVER ERROR] [GET /api/ack/[token]] Security token lookup failed or token invalid:", {
      token,
      error: scErr?.message,
      details: scErr?.details,
    });
    return new Response(renderHtml("Invalid Token", "Security token not found or already invalidated.", false), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  // 2. Handle already acknowledged state
  if (sc.status === "acked") {
    return new Response(
      renderHtml("Already Acknowledged", "This incident has already been acknowledged. The escalation waterfall remains halted.", true),
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  // 3. Handle timed out state
  if (sc.status === "timed_out") {
    return new Response(
      renderHtml("Wait Window Expired", "Your acknowledgment window timed out. Escalation has already cascaded to secondary contacts.", false),
      {
        status: 410,
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  // 4. Mark this contact as 'acked'
  const { error: updateScErr } = await supabase
    .from("switch_contacts")
    .update({
      status: "acked",
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", sc.id);

  if (updateScErr) {
    console.error("[SERVER ERROR] [GET /api/ack/[token]] Failed updating contact status to 'acked':", {
      contactId: sc.id,
      switchId: sc.switch_id,
      error: updateScErr.message,
      details: updateScErr.details,
    });
    return new Response(renderHtml("Database Error", "Failed to register contact acknowledgment.", false), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }

  // 5. Reset all other 'pending' contacts of this switch back to NULL
  const { error: resetErr } = await supabase
    .from("switch_contacts")
    .update({ status: null })
    .eq("switch_id", sc.switch_id)
    .eq("status", "pending");

  if (resetErr) {
    console.error("[SERVER ERROR] [GET /api/ack/[token]] Failed resetting pending contacts to null:", {
      switchId: sc.switch_id,
      error: resetErr.message,
    });
  }

  // 6. Mark parent switch as RESOLVED so cron ignores it completely
  const { error: resolveErr } = await supabase
    .from("switches")
    .update({ status: "RESOLVED" })
    .eq("id", sc.switch_id);

  if (resolveErr) {
    console.error("[SERVER ERROR] [GET /api/ack/[token]] Failed marking switch as RESOLVED:", {
      switchId: sc.switch_id,
      error: resolveErr.message,
    });
  }

  // 7. Log acknowledgment event
  const { error: logErr } = await supabase.from("escalation_logs").insert({
    usr_id: sc.switches?.usr_id,
    switch_id: sc.switch_id,
    event_type: "CHECKIN_PULSE",
    channel: "EMAIL_ACK",
    recipient_email: sc.contacts?.email,
    status: "SUCCESS",
    details: `Incident acknowledged by ${sc.contacts?.contact_name || sc.contacts?.email}. Switch transitioned to RESOLVED. Uncontacted recipients reverted to null.`,
    execution_metadata: { ack_token: token },
  });

  if (logErr) {
    console.error("[SERVER ERROR] [GET /api/ack/[token]] Failed logging acknowledgment event:", {
      switchId: sc.switch_id,
      error: logErr.message,
    });
  }

  return new Response(
    renderHtml(
      "Incident Acknowledged",
      `Thank you, <strong>${sc.contacts?.contact_name || sc.contacts?.email}</strong>. Receipt of sentinel <strong>${sc.switches?.name}</strong> has been logged. The escalation waterfall has been halted.`,
      true
    ),
    {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }
  );
}

function renderHtml(title, message, isSuccess) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${title} | Vigil</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #08090c;
          color: #f1f5f9;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .card {
          max-width: 480px;
          margin: 20px;
          background: radial-gradient(circle at top left, #171b26, #0d111a);
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.8);
          text-align: center;
        }
        .status-pip {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: ${isSuccess ? "#34d399" : "#f43f5e"};
          margin-bottom: 16px;
        }
        h1 {
          font-size: 20px;
          margin: 0 0 12px 0;
          color: #ffffff;
        }
        p {
          font-size: 14px;
          line-height: 1.6;
          color: #94a3b8;
          margin: 0;
        }
        .badge {
          display: inline-block;
          font-family: monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 4px 8px;
          border-radius: 4px;
          background-color: rgba(255, 255, 255, 0.05);
          border: 1px solid #1e293b;
          margin-top: 24px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="status-pip"></div>
        <h1>${title}</h1>
        <p>${message}</p>
        <div class="badge">Vigil Sentinel System</div>
      </div>
    </body>
    </html>
  `;
}