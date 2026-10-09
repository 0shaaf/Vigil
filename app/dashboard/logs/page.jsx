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

  const PAGE_SIZE = 50;

  // 3. Query initial slice of 50 logs using user.id and exact count
  const { data: logs, count, error } = await supabase
    .from("escalation_logs")
    .select(
      `
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
    `,
      { count: "exact" }
    )
    .eq("usr_id", user.id)
    .order("created_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  if (error) {
    console.error("[EscalationLogsPage] Error fetching telemetry:", error);
  }

  const totalCount = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <main className="logs-container">
      <LogsViewer
        initialLogs={logs || []}
        initialTotalCount={totalCount}
        initialTotalPages={totalPages}
        pageSize={PAGE_SIZE}
      />
    </main>
  );
}