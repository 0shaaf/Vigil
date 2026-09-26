"use client";

import React, { useState } from "react";

export default function LogsViewer({ initialLogs }) {
  const [logs] = useState(initialLogs || []);
  const [selectedEvent, setSelectedEvent] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [activeModalLog, setActiveModalLog] = useState(null);

  // Filter evaluation
  const filteredLogs = logs.filter((log) => {
    const matchesEvent = selectedEvent === "ALL" || log.event_type === selectedEvent;
    const matchesStatus = selectedStatus === "ALL" || log.status === selectedStatus;
    return matchesEvent && matchesStatus;
  });

  const getEventBadgeClass = (eventType) => {
    switch (eventType) {
      case "TRIP_WARNING":
        return "event-warning";
      case "CHECKIN_PULSE":
        return "event-pulse";
      case "TRIGGER_FIRED":
        return "event-trip";
      case "PAYLOAD_DISPATCHED":
        return "event-payload";
      case "LOCKDOWN_INVOKED":
        return "event-lockdown";
      default:
        return "event-warning";
    }
  };

  return (
    <>
      {/* Controls Bar */}
      <div className="logs-controls">
        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="logs-select"
        >
          <option value="ALL">All Event Types</option>
          <option value="TRIP_WARNING">Trip Warning (25%)</option>
          <option value="CHECKIN_PULSE">Heartbeat Pulse</option>
          <option value="TRIGGER_FIRED">Trigger Fired</option>
          <option value="PAYLOAD_DISPATCHED">Payload Dispatched</option>
          <option value="LOCKDOWN_INVOKED">Lockdown Webhook</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="logs-select"
        >
          <option value="ALL">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
        </select>

        <span className="logs-count-badge">
          Showing {filteredLogs.length} of {logs.length} events
        </span>
      </div>

      {/* Table Data View */}
      <div className="logs-table-wrapper">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Target Switch</th>
              <th>Event</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Target / Recipient</th>
              <th>Telemetry</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="logs-empty">
                  No telemetry entries found matching current filter constraints.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td className="log-timestamp">
                    {new Date(log.created_at).toLocaleDateString()}{" "}
                    {new Date(log.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="log-switch-name">
                    {log.switches?.name || `Switch #${log.switch_id}`}
                  </td>
                  <td>
                    <span className={`event-badge ${getEventBadgeClass(log.event_type)}`}>
                      {log.event_type}
                    </span>
                  </td>
                  <td className="log-channel">{log.channel || "SYSTEM"}</td>
                  <td>
                    <span
                      className={`status-pill ${
                        log.status === "SUCCESS" ? "success" : "failed"
                      }`}
                    >
                      <span className="status-bullet" />
                      {log.status}
                    </span>
                  </td>
                  <td style={{ fontSize: "12px", color: "#cbd5e1" }}>
                    {log.recipient_email ||
                      (log.execution_metadata?.url ? (
                        <span style={{ fontFamily: "monospace", fontSize: "11px" }}>
                          {log.execution_metadata.url}
                        </span>
                      ) : (
                        "—"
                      ))}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setActiveModalLog(log)}
                      className="btn-inspect"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail / JSON Drawer Modal */}
      {activeModalLog && (
        <div className="modal-overlay" onClick={() => setActiveModalLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <span
                  className={`event-badge ${getEventBadgeClass(activeModalLog.event_type)}`}
                >
                  {activeModalLog.event_type}
                </span>
                <span>Telemetry Inspection</span>
              </h2>
              <button
                type="button"
                className="btn-close"
                onClick={() => setActiveModalLog(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-meta-grid">
                <div>
                  <div className="meta-field-label">Target Switch</div>
                  <div className="meta-field-value">
                    {activeModalLog.switches?.name || `ID: ${activeModalLog.switch_id}`}
                  </div>
                </div>
                <div>
                  <div className="meta-field-label">Dispatched Channel</div>
                  <div className="meta-field-value">{activeModalLog.channel || "INTERNAL"}</div>
                </div>
                <div>
                  <div className="meta-field-label">Delivery Status</div>
                  <div className="meta-field-value" style={{ fontWeight: 700 }}>
                    {activeModalLog.status}
                  </div>
                </div>
                <div>
                  <div className="meta-field-label">Event Timestamp</div>
                  <div className="meta-field-value">
                    {new Date(activeModalLog.created_at).toISOString()}
                  </div>
                </div>
              </div>

              {activeModalLog.details && (
                <div style={{ marginBottom: "16px" }}>
                  <div className="meta-field-label" style={{ marginBottom: "4px" }}>
                    Execution Summary
                  </div>
                  <div
                    style={{
                      backgroundColor: "#111622",
                      border: "1px solid #1e293b",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      color: "#cbd5e1",
                    }}
                  >
                    {activeModalLog.details}
                  </div>
                </div>
              )}

              <div className="json-inspector-title">Raw Telemetry & Metadata</div>
              <pre className="json-block">
                {JSON.stringify(
                  {
                    id: activeModalLog.id,
                    switch_id: activeModalLog.switch_id,
                    recipient_email: activeModalLog.recipient_email,
                    trust_tier: activeModalLog.trust_tier,
                    execution_metadata: activeModalLog.execution_metadata || null,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}