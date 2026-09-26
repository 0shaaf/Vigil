import React from "react";
import { redirect } from "next/navigation";
import LogsViewer from "./LogsViewer";
import "../css/logs.css";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";

export const metadata = {
  title: "Audit & Escalation Logs | Vigil",
  description: "View telemetry, warning dispatches, heartbeat pulses, and fail-safe triggers",
};

export default async function EscalationLogsPage() {
  const supabase = await createSupabaseServerClient();

  // 1. Get the authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // 2. Redirect to login if unauthenticated or session expired
  if (authError || !user) {
    redirect("/login");
  }

  // 3. Query using user.id (NOT user.usr_id)
  const { data: logs, error } = await supabase
    .from("escalation_logs")
    .select(`
      id,
      usr_id,
      switch_id,
      event_type,
      channel,
      recipient_email,
      trust_tier,
      status,
      details,
      execution_metadata,
      created_at,
      switches:switch_id (
        id,
        name
      )
    `)
    .eq("usr_id", user.id)
    .order("created_at", { ascending: false });

    console.log(logs);
  if (error) {
    console.error("[EscalationLogsPage] Error fetching telemetry:", error);
  }

  return (
    <main className="logs-container">
      <header className="logs-header">
        <div className="logs-title-area">
          <h1>
            <span className="logs-title-pip" />
            Audit & Escalation Logs
          </h1>
          <p>
            Real-time audit telemetry capturing warning dispatches, heartbeat pulses, and autonomous activations.
          </p>
        </div>
      </header>

      <LogsViewer initialLogs={logs || []} />
    </main>
  );
}