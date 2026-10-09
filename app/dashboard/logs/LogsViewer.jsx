"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Activity,
  Terminal,
  X,
  Copy,
  Check,
  Radio,
  AlertTriangle,
  Zap,
  Send,
  Lock,
  ArrowUpRight,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
} from "lucide-react";
function FilterDropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const selectedOption = options.find((o) => o.id === value) || options[0];
  const isFiltered = value !== "ALL";

  return (
    <div className={`filter-dropdown-wrap ${open ? "is-open" : ""}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`filter-dropdown-btn ${isFiltered ? "active-filter" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="dropdown-label">{label}:</span>
        <span className="dropdown-value">{selectedOption.label}</span>
        <ChevronDown size={14} className={`dropdown-chevron-icon ${open ? "rotated" : ""}`} />
      </button>

      {open && (
        <div className="filter-dropdown-menu" role="listbox">
          {options.map((opt) => {
            const isSelected = opt.id === value;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={`filter-dropdown-item ${isSelected ? "selected" : ""}`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={14} className="dropdown-check-icon" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LogsViewer({
  initialLogs = [],
  initialTotalCount = 0,
  initialTotalPages = 1,
  pageSize = 50,
}) {
  const [logs, setLogs] = useState(initialLogs || []);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loadingPage, setLoadingPage] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [activeModalLog, setActiveModalLog] = useState(null);
  const [copied, setCopied] = useState(false);

  const handlePageChange = async (targetPage) => {
    if (loadingPage || targetPage < 1 || targetPage > totalPages || targetPage === page) {
      return;
    }
    setLoadingPage(true);
    try {
      const res = await fetchLogsPage(targetPage);
      if (res.error) {
        console.error("Failed to load logs page:", res.error);
      } else {
        setLogs(res.logs || []);
        setPage(res.page);
        setTotalCount(res.totalCount);
        setTotalPages(res.totalPages);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      console.error("Error navigating logs page:", err);
    } finally {
      setLoadingPage(false);
    }
  };

  // Filter evaluation
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesEvent =
        selectedEvent === "ALL" || log.event_type === selectedEvent;
      const matchesStatus =
        selectedStatus === "ALL" || log.status === selectedStatus;

      return matchesEvent && matchesStatus;
    });
  }, [logs, selectedEvent, selectedStatus]);

  const getEventMeta = useCallback((eventType) => {
    switch (eventType) {
      case "CHECKIN_PULSE":
        return {
          code: "PULSE • RENEWED",
          classKey: "pulse",
          color: "#10b981",
          Icon: Zap,
        };
      case "TRIP_WARNING":
        return {
          code: "WARN • ESCALATING",
          classKey: "warning",
          color: "#f59e0b",
          Icon: AlertTriangle,
        };
      case "TRIGGER_FIRED":
        return {
          code: "TRIP • FIRED",
          classKey: "trip",
          color: "#f43f5e",
          Icon: Radio,
        };
      case "PAYLOAD_DISPATCHED":
        return {
          code: "DISPATCH • PAYLOAD",
          classKey: "payload",
          color: "#ff3b19",
          Icon: Send,
        };
      case "LOCKDOWN_INVOKED":
        return {
          code: "LOCKDOWN • ACTIVE",
          classKey: "lockdown",
          color: "#c084fc",
          Icon: Lock,
        };
      default:
        return {
          code: `EVT • ${eventType}`,
          classKey: "default",
          color: "#94a3b8",
          Icon: Activity,
        };
    }
  }, []);

  const handleCopyJson = (payload) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy json", e);
    }
  };

  const eventFilterOptions = [
    { id: "ALL", label: "All Events" },
    { id: "CHECKIN_PULSE", label: "Pulses" },
    { id: "TRIP_WARNING", label: "Warnings" },
    { id: "TRIGGER_FIRED", label: "Triggers" },
    { id: "PAYLOAD_DISPATCHED", label: "Dispatches" },
    { id: "LOCKDOWN_INVOKED", label: "Lockdowns" },
  ];

  const statusFilterOptions = [
    { id: "ALL", label: "All Status" },
    { id: "SUCCESS", label: "Verified" },
    { id: "FAILED", label: "Dropped" },
  ];

  return (
    <>
      {/* 1. Header */}
      <header className="logs-header">
        <div>
          <h1 className="logs-title">Audit & Escalation Logs</h1>
          <p className="logs-subtitle">
            Cryptographic ledger tracking heartbeat pulses, warning dispatches, and autonomous fail-safe triggers.
          </p>
        </div>
      </header>

      {/* 2. Filter-by Bar: Concise Dropdown Controls */}
      <div className="logs-filter-bar">
        <div className="filter-bar-header">
          <SlidersHorizontal size={13} className="filter-bar-icon" />
          <span className="filter-bar-title">Filter by</span>
        </div>

        <div className="filter-bar-controls">
          <FilterDropdown
            label="Event"
            value={selectedEvent}
            options={eventFilterOptions}
            onChange={setSelectedEvent}
          />

          <FilterDropdown
            label="Status"
            value={selectedStatus}
            options={statusFilterOptions}
            onChange={setSelectedStatus}
          />

          {(selectedEvent !== "ALL" || selectedStatus !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSelectedEvent("ALL");
                setSelectedStatus("ALL");
              }}
              className="filter-bar-reset-btn"
              title="Reset all filters"
            >
              <X size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Telemetry Table Shell */}
      <div className="logs-table-wrapper">
        <table className="logs-table">
          <thead>
            <tr>
              <th>TIMESTAMP (LOCAL)</th>
              <th>SWITCH TARGET</th>
              <th>EVENT TELEMETRY</th>
              <th>CHANNEL</th>
              <th>STATUS VERDICT</th>
              <th>DISPATCH TARGET</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="logs-empty">
                  <div className="logs-empty-inner">
                    <SlidersHorizontal size={24} className="text-white/30" />
                    <span className="empty-title">NO TELEMETRY MATCHES FOUND</span>
                    <span className="empty-sub">
                      No audit events correspond to the active filter constraints.
                    </span>
                    {(selectedEvent !== "ALL" || selectedStatus !== "ALL") && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvent("ALL");
                          setSelectedStatus("ALL");
                        }}
                        className="btn-reset-filters"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const meta = getEventMeta(log.event_type);
                const isSuccess = log.status === "SUCCESS";
                const dateObj = new Date(log.created_at);
                const dateStr = dateObj.toLocaleDateString();
                const timeStr = dateObj.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                });

                return (
                  <tr key={log.id} className={`log-row row-${meta.classKey}`}>
                    {/* Timestamp */}
                    <td className="log-timestamp">
                      <span className="ts-date">{dateStr}</span>
                      <span className="ts-time">{timeStr}</span>
                    </td>

                    {/* Target Switch */}
                    <td className="log-switch-name">
                      <span className="switch-anchor" title={log.switches?.name || `ID: ${log.switch_id}`}>
                        {log.switches?.name || `ID: ${log.switch_id.slice(0, 8)}...`}
                      </span>
                    </td>

                    {/* Event Code (Simply Colored Text, No Capsules) */}
                    <td className="log-event-cell">
                      <span className={`log-event-text event-${meta.classKey}`}>
                        {meta.code}
                      </span>
                    </td>

                    {/* Channel */}
                    <td className="log-channel">
                      <span className="channel-prefix">•</span>
                      <span>{log.channel || "INTERNAL"}</span>
                    </td>

                    {/* Status Verdict (Simply Colored Text, No Capsules) */}
                    <td className="log-status-cell">
                      <span className={`log-verdict-text ${isSuccess ? "verdict-success" : "verdict-failed"}`}>
                        {isSuccess ? "200 • DELIVERED" : "ERR • DROPPED"}
                      </span>
                    </td>

                    {/* Target Recipient */}
                    <td className="log-recipient-cell">
                      {log.recipient_email ? (
                        <span className="recipient-text" title={log.recipient_email}>
                          {log.recipient_email}
                        </span>
                      ) : log.execution_metadata?.url ? (
                        <span className="recipient-url" title={log.execution_metadata.url}>
                          {log.execution_metadata.url}
                        </span>
                      ) : (
                        <span className="recipient-none">—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="log-action-cell">
                      <button
                        type="button"
                        onClick={() => setActiveModalLog(log)}
                        className="btn-telemetry-inspect"
                        title="Inspect telemetry envelope"
                      >
                        <Terminal size={11} />
                        <span>INSPECT</span>
                        <ArrowUpRight size={10} className="inspect-arrow" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Tactical Pagination Navigation Bar */}
      <div className="logs-pagination-bar">
        <div className="logs-pagination-info">
          SHOWING{" "}
          <span className="pagination-highlight">
            {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}
          </span>
          {" – "}
          <span className="pagination-highlight">
            {Math.min(page * pageSize, totalCount)}
          </span>{" "}
          OF <span className="pagination-highlight">{totalCount}</span> RECORDS
        </div>

        <div className="logs-pagination-actions">
          <div className="pagination-page-indicator">
            PAGE <span className="pagination-highlight">{page}</span> OF{" "}
            <span className="pagination-highlight">{totalPages}</span>
          </div>

          <div className="pagination-nav-buttons">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loadingPage}
              className="btn-pagination"
              title="Previous 50 logs"
            >
              <ChevronLeft size={14} />
              <span>PREVIOUS</span>
            </button>

            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || loadingPage}
              className="btn-pagination"
              title="Next 50 logs"
            >
              {loadingPage ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>LOADING...</span>
                </>
              ) : (
                <>
                  <span>NEXT</span>
                  <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 5. Inspection Console Modal (Dark Obsidian HUD) */}
      {activeModalLog && (
        <div className="modal-overlay" onClick={() => setActiveModalLog(null)}>
          <div className="telemetry-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top-accent" />

            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-eyebrow">
                  <Terminal size={12} className="text-[#ff3b19]" />
                  <span>TELEMETRY ENVELOPE • {activeModalLog.id.slice(0, 8)}</span>
                </div>
                <h2 className="modal-title">
                  <span>{activeModalLog.event_type}</span>
                </h2>
              </div>

              <div className="modal-header-actions">
                <button
                  type="button"
                  onClick={() =>
                    handleCopyJson({
                      id: activeModalLog.id,
                      switch_id: activeModalLog.switch_id,
                      event_type: activeModalLog.event_type,
                      channel: activeModalLog.channel,
                      status: activeModalLog.status,
                      recipient_email: activeModalLog.recipient_email,
                      trust_tier: activeModalLog.trust_tier,
                      details: activeModalLog.details,
                      execution_metadata: activeModalLog.execution_metadata,
                      created_at: activeModalLog.created_at,
                    })
                  }
                  className="btn-modal-action"
                  title="Copy JSON Payload"
                >
                  {copied ? (
                    <>
                      <Check size={12} className="text-[#10b981]" />
                      <span>COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>COPY JSON</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn-modal-close"
                  onClick={() => setActiveModalLog(null)}
                  title="Close console"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="modal-body">
              {/* Telemetry Metric Cards */}
              <div className="telemetry-metric-grid">
                <div className="metric-box">
                  <span className="metric-label">TARGET SWITCH</span>
                  <span className="metric-val">
                    {activeModalLog.switches?.name || `ID: ${activeModalLog.switch_id.slice(0, 8)}...`}
                  </span>
                </div>

                <div className="metric-box">
                  <span className="metric-label">DISPATCH CHANNEL</span>
                  <span className="metric-val mono">{activeModalLog.channel || "INTERNAL"}</span>
                </div>

                <div className="metric-box">
                  <span className="metric-label">DELIVERY VERDICT</span>
                  <span
                    className={`log-verdict-text ${
                      activeModalLog.status === "SUCCESS"
                        ? "verdict-success"
                        : "verdict-failed"
                    }`}
                  >
                    {activeModalLog.status === "SUCCESS"
                      ? "200 • DELIVERED"
                      : "ERR • DROPPED"}
                  </span>
                </div>

                <div className="metric-box">
                  <span className="metric-label">TIMESTAMP (UTC)</span>
                  <span className="metric-val mono">
                    {new Date(activeModalLog.created_at).toISOString()}
                  </span>
                </div>
              </div>

              {/* Execution Summary (if available) */}
              {activeModalLog.details && (
                <div className="execution-summary-section">
                  <div className="summary-label">EXECUTION DETAILS</div>
                  <div className="summary-text">{activeModalLog.details}</div>
                </div>
              )}

              {/* Raw JSON Block */}
              <div className="raw-payload-section">
                <div className="payload-header">
                  <span className="payload-title">RAW TELEMETRY PAYLOAD</span>
                  <span className="payload-format">JSON • UTF-8</span>
                </div>
                <pre className="json-terminal-box">
                  {JSON.stringify(
                    {
                      id: activeModalLog.id,
                      switch_id: activeModalLog.switch_id,
                      recipient_email: activeModalLog.recipient_email,
                      trust_tier: activeModalLog.trust_tier,
                      details: activeModalLog.details,
                      execution_metadata: activeModalLog.execution_metadata || null,
                      created_at: activeModalLog.created_at,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}