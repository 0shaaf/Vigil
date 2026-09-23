import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import "../css/logs.css";

function formatTimestamp(isoString) {
  if (!isoString) return "--";
  const date = new Date(isoString);
  return date.toISOString().replace("T", " ").substring(0, 19) + " UTC";
}

function renderClearanceBadge(tier) {
  if (tier === -1) return <span className="clearance-pill clearance-exception">EXCEPT (-1)</span>;
  if (tier >= 75) return <span className="clearance-pill clearance-high">TRUST ≥ 75</span>;
  if (tier >= 50) return <span className="clearance-pill clearance-med">TRUST ≥ 50</span>;
  if (tier >= 25) return <span className="clearance-pill clearance-low">TRUST ≥ 25</span>;
  return <span className="clearance-none">System</span>;
}

export default async function LogsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Query audit logs descending by timestamp
  const { data: logsData, error } = await supabase
    .from("escalation_logs")
    .select(`
      id,
      event_type,
      channel,
      recipient_email,
      trust_tier,
      status,
      details,
      created_at,
      switches (
        name
      )
    `)
    .eq("usr_id", user.id)
    .order("created_at", { ascending: false });

  const logs = logsData || [];

  // Metrics calculation
  const totalEvents = logs.length;
  const dispatches = logs.filter((l) => l.event_type.includes("DISPATCH") || l.event_type.includes("TRIGGER")).length;
  const failures = logs.filter((l) => l.status === "FAILED").length;
  const delivered = logs.filter((l) => l.status === "SUCCESS").length;

  return (
    <div className="logs-page">
      <header className="logs-header">
        <div>
          <h1 className="logs-title">Escalation Logs</h1>
          <p className="logs-subtitle">
            Immutable audit record of heartbeat expirations, trust checks, and payload releases.
          </p>
        </div>
      </header>

      {/* Metric Cards Bar */}
      <section className="logs-metrics-bar">
        <div className="log-metric-card">
          <span className="metric-card-label">Total Events</span>
          <span className="metric-card-val">{totalEvents}</span>
        </div>
        <div className="log-metric-card">
          <span className="metric-card-label">Dispatches</span>
          <span className="metric-card-val">{dispatches}</span>
        </div>
        <div className="log-metric-card">
          <span className="metric-card-label">Delivered</span>
          <span className="metric-card-val">{delivered}</span>
        </div>
        <div className="log-metric-card">
          <span className="metric-card-label">Failed Transmissions</span>
          <span className="metric-card-val">{failures}</span>
        </div>
      </section>

      {/* Logs Table */}
      <div className="logs-table-wrapper">
        {logs.length === 0 ? (
          <div className="logs-empty">
            No escalation telemetry recorded yet. Trigger events, warnings, and payload transmissions will appear here.
          </div>
        ) : (
          <table className="logs-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event / Origin</th>
                <th>Channel</th>
                <th>Clearance Tier</th>
                <th>Recipient</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const statusClass =
                  log.status === "SUCCESS"
                    ? "is-success"
                    : log.status === "FAILED"
                    ? "is-failed"
                    : "is-pending";

                return (
                  <tr key={log.id}>
                    <td className="cell-timestamp">{formatTimestamp(log.created_at)}</td>
                    <td>
                      <div className="cell-event">
                        <span className="event-name">{log.event_type}</span>
                        <span className="event-switch">
                          {log.switches?.name ? `Node: ${log.switches.name}` : "Direct Trigger"}
                        </span>
                      </div>
                    </td>
                    <td>
                      {log.channel ? (
                        <span className="channel-pill">{log.channel}</span>
                      ) : (
                        <span className="clearance-none">Internal</span>
                      )}
                    </td>
                    <td>{renderClearanceBadge(log.trust_tier)}</td>
                    <td style={{ fontFamily: "monospace", color: "#888" }}>
                      {log.recipient_email || "--"}
                    </td>
                    <td>
                      <span className={`status-badge ${statusClass}`}>
                        <span className="status-dot" />
                        {log.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}