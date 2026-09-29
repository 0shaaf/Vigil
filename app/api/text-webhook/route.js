import { NextResponse } from "next/server";

async function handleIncomingWebhook(req) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const authHeader = req.headers.get("authorization");
  const userAgent = req.headers.get("user-agent");

  let body = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  // Print inspection output directly to terminal
  console.log("\n==========================================");
  console.log(`🚨 [TEST WEBHOOK RECEIVED] ${timestamp}`);
  console.log(`Method:        ${method}`);
  console.log(`User-Agent:    ${userAgent}`);
  console.log(`Authorization: ${authHeader || "None provided"}`);
  console.log("Payload Content:");
  console.dir(body, { depth: null, colors: true });
  console.log("==========================================\n");

  return NextResponse.json(
    {
      status: "TERMINATION_ACKNOWLEDGED",
      message: "Test kill-switch webhook processed successfully.",
      received_at: timestamp,
      meta: {
        method,
        has_auth: Boolean(authHeader),
        switch_id: body?._vigil_event?.switch_id || null,
        switch_name: body?._vigil_event?.switch_name || null,
      },
    },
    { status: 200 }
  );
}

export async function POST(req) {
  return handleIncomingWebhook(req);
}

export async function PUT(req) {
  return handleIncomingWebhook(req);
}

export async function DELETE(req) {
  return handleIncomingWebhook(req);
}