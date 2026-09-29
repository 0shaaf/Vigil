"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateSwitch } from "@/app/actions/switches";
import GoogleDrivePickerModal from "@/app/compontents/GoogleDrivePickerModal";

export default function EditFormSwitch({ initialSwitch, availableContacts = [] }) {
  const router = useRouter();

  const contactsList =
    availableContacts.length > 0
      ? availableContacts
      : initialSwitch?.contacts ||
        initialSwitch?.switch_contacts?.map((sc) => sc.contacts || sc) ||
        [];

  const [name, setName] = useState(initialSwitch?.name || "");
  const [criticality, setCriticality] = useState(initialSwitch?.criticality || "OPERATIONAL");
  const [purpose, setPurpose] = useState(initialSwitch?.purpose || "PERSONAL");

  // Interval Units
  const [months, setMonths] = useState(initialSwitch?.check_in_interval?.months ?? 0);
  const [days, setDays] = useState(initialSwitch?.check_in_interval?.days ?? 0);
  const [hours, setHours] = useState(initialSwitch?.check_in_interval?.hours ?? 0);
  const [minutes, setMinutes] = useState(initialSwitch?.check_in_interval?.minutes ?? 0);

  // Modular Actions
  const [modules, setModules] = useState({
    beacon: Boolean(initialSwitch?.actions?.modules?.beacon ?? true),
    data_release: Boolean(initialSwitch?.actions?.modules?.data_release ?? false),
    purge: Boolean(initialSwitch?.actions?.modules?.purge ?? false),
    lockdown: Boolean(initialSwitch?.actions?.modules?.lockdown ?? false),
  });

  // Lockdown Webhook Configuration State
  const [lockdownConfig, setLockdownConfig] = useState({
    http_method: initialSwitch?.actions?.lockdown_config?.http_method || "POST",
    webhook_url: initialSwitch?.actions?.lockdown_config?.webhook_url || "",
    auth_header: initialSwitch?.actions?.lockdown_config?.auth_header || "",
    payload_json:
      initialSwitch?.actions?.lockdown_config?.payload_json ||
      '{\n  "action": "REVOKE_ALL_SESSIONS"\n}',
  });

  // Disclosures / Beacon rows with Drive files
  const [beaconRows, setBeaconRows] = useState(() => {
    const existing = initialSwitch?.beacon_rows || initialSwitch?.info_to_release;
    if (Array.isArray(existing) && existing.length > 0) {
      return existing.map((r) => ({
        id: r.id,
        content: r.content || "",
        trust_required: r.trust_required ?? 50,
        target_contact_id: r.target_contact_id ? String(r.target_contact_id) : "",
        file_metadata: Array.isArray(r.file_metadata) ? r.file_metadata : [],
      }));
    }
    return [
      {
        content: "",
        trust_required: 50,
        target_contact_id: "",
        file_metadata: [],
      },
    ];
  });

  // Drive Picker Modal State
  const [activeDriveRowIndex, setActiveDriveRowIndex] = useState(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  const toggleModule = (moduleKey) => {
    setModules((prev) => ({ ...prev, [moduleKey]: !prev[moduleKey] }));
  };

  const addBeaconRow = () => {
    setBeaconRows((prev) => [
      ...prev,
      { content: "", trust_required: 50, target_contact_id: "", file_metadata: [] },
    ]);
  };

  const removeBeaconRow = (index) => {
    setBeaconRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBeaconRow = (index, field, value) => {
    setBeaconRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const openDrivePicker = (index) => {
    setActiveDriveRowIndex(index);
    setIsDriveModalOpen(true);
  };

  const handleDriveFilesConfirmed = (selectedFiles) => {
    if (activeDriveRowIndex !== null) {
      setBeaconRows((prev) => {
        const next = [...prev];
        next[activeDriveRowIndex] = {
          ...next[activeDriveRowIndex],
          file_metadata: selectedFiles,
        };
        return next;
      });
    }
  };

  const removeDriveFile = (rowIndex, fileId) => {
    setBeaconRows((prev) => {
      const next = [...prev];
      const files = next[rowIndex]?.file_metadata || [];
      next[rowIndex] = {
        ...next[rowIndex],
        file_metadata: files.filter((f) => f.id !== fileId),
      };
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg({ type: "", text: "" });

    if (months === 0 && days === 0 && hours === 0 && minutes === 0) {
      setStatusMsg({ type: "error", text: "Countdown interval must be greater than 0 minutes." });
      setSaving(false);
      return;
    }

    try {
      const sanitizedBeaconRows = modules.beacon
        ? beaconRows
            .filter(
              (row) =>
                row.content?.trim() ||
                (Array.isArray(row.file_metadata) && row.file_metadata.length > 0)
            )
            .map((row) => {
              const trustVal = Number(row.trust_required);
              return {
                id: row.id,
                content: row.content?.trim() || "",
                trust_required: trustVal,
                target_contact_id:
                  trustVal === -1 && row.target_contact_id ? row.target_contact_id : null,
                file_metadata: Array.isArray(row.file_metadata) ? row.file_metadata : [],
              };
            })
        : [];

      const payload = {
        name,
        criticality,
        purpose,
        check_in_interval: {
          months: Number(months),
          days: Number(days),
          hours: Number(hours),
          minutes: Number(minutes),
        },
        actions: {
          ...initialSwitch.actions,
          modules,
          lockdown_config: modules.lockdown ? lockdownConfig : null,
        },
        beacon_rows: sanitizedBeaconRows,
      };

      await updateSwitch(initialSwitch.id, payload);
      setStatusMsg({ type: "success", text: "Configuration saved successfully. Redirecting..." });
      router.refresh();
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch (err) {
      setStatusMsg({ type: "error", text: err.message || "Failed to update switch." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="edit-form-card">
      {statusMsg.text && (
        <div className={`alert-banner ${statusMsg.type}`}>{statusMsg.text}</div>
      )}

      {/* 1. Core Metadata */}
      <div>
        <div className="form-section-title">01 // Primary Identifiers</div>
        <div className="form-group" style={{ marginBottom: "16px" }}>
          <label className="form-label">Switch Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
            placeholder="e.g. Master Fail-Safe Sentinel"
          />
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Criticality Tier</label>
            <select
              value={criticality}
              onChange={(e) => setCriticality(e.target.value)}
              className="form-select"
            >
              <option value="OPERATIONAL">OPERATIONAL (Standard)</option>
              <option value="SENTINEL">SENTINEL (Heightened)</option>
              <option value="CRITICAL">CRITICAL (Zero Delay)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Domain Purpose</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="form-input"
              placeholder="e.g. INFRASTRUCTURE, FINANCIAL, PERSONAL"
            />
          </div>
        </div>
      </div>

      {/* 2. Interval Breakdown */}
      <div>
        <div className="form-section-title">02 // Reset Countdown Interval</div>
        <div className="interval-grid">
          <div className="interval-unit-card">
            <span className="interval-label">Months</span>
            <input
              type="number"
              min="0"
              max="12"
              value={months}
              onChange={(e) => setMonths(Math.max(0, parseInt(e.target.value) || 0))}
              className="interval-input"
            />
          </div>
          <div className="interval-unit-card">
            <span className="interval-label">Days</span>
            <input
              type="number"
              min="0"
              max="31"
              value={days}
              onChange={(e) => setDays(Math.max(0, parseInt(e.target.value) || 0))}
              className="interval-input"
            />
          </div>
          <div className="interval-unit-card">
            <span className="interval-label">Hours</span>
            <input
              type="number"
              min="0"
              max="23"
              value={hours}
              onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
              className="interval-input"
            />
          </div>
          <div className="interval-unit-card">
            <span className="interval-label">Minutes</span>
            <input
              type="number"
              min="0"
              max="59"
              value={minutes}
              onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
              className="interval-input"
            />
          </div>
        </div>
      </div>

      {/* 3. Modular Actions */}
      <div>
        <div className="form-section-title">03 // Action Module Configuration</div>
        <div className="modules-grid">
          <div
            className={`module-toggle-card ${modules.beacon ? "active" : ""}`}
            onClick={() => toggleModule("beacon")}
          >
            <div className="module-info">
              <span className="module-name">Emergency Beacon</span>
              <span className="module-desc">Outbound email dispatch to contacts</span>
            </div>
            <span className={`module-indicator ${modules.beacon ? "on" : "off"}`}>
              {modules.beacon ? "Active" : "Disarmed"}
            </span>
          </div>

          <div
            className={`module-toggle-card ${modules.data_release ? "active" : ""}`}
            onClick={() => toggleModule("data_release")}
          >
            <div className="module-info">
              <span className="module-name">Data Release</span>
              <span className="module-desc">Drive permissions disclosure engine</span>
            </div>
            <span className={`module-indicator ${modules.data_release ? "on" : "off"}`}>
              {modules.data_release ? "Active" : "Disarmed"}
            </span>
          </div>

          <div
            className={`module-toggle-card ${modules.purge ? "active" : ""}`}
            onClick={() => toggleModule("purge")}
          >
            <div className="module-info">
              <span className="module-name">Destructive Purge</span>
              <span className="module-desc">Automated cloud asset shredding</span>
            </div>
            <span className={`module-indicator ${modules.purge ? "on" : "off"}`}>
              {modules.purge ? "Active" : "Disarmed"}
            </span>
          </div>

          <div
            className={`module-toggle-card ${modules.lockdown ? "active" : ""}`}
            onClick={() => toggleModule("lockdown")}
          >
            <div className="module-info">
              <span className="module-name">Lockdown Webhook</span>
              <span className="module-desc">Outbound HTTP kill-switches</span>
            </div>
            <span className={`module-indicator ${modules.lockdown ? "on" : "off"}`}>
              {modules.lockdown ? "Active" : "Disarmed"}
            </span>
          </div>
        </div>

        {/* Lockdown Webhook Settings Form */}
        {modules.lockdown && (
          <div
            style={{
              marginTop: "16px",
              padding: "16px",
              background: "#0b0f19",
              border: "1px solid #1e293b",
              borderRadius: "8px",
            }}
          >
            <div className="form-section-title" style={{ margin: "0 0 12px 0" }}>
              Lockdown Webhook Parameters
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr 1fr",
                gap: "12px",
                marginBottom: "12px",
              }}
            >
              <div className="form-group">
                <label className="form-label">Method</label>
                <select
                  value={lockdownConfig.http_method}
                  onChange={(e) =>
                    setLockdownConfig({ ...lockdownConfig, http_method: e.target.value })
                  }
                  className="form-select"
                >
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Webhook URL</label>
                <input
                  type="url"
                  value={lockdownConfig.webhook_url}
                  onChange={(e) =>
                    setLockdownConfig({ ...lockdownConfig, webhook_url: e.target.value })
                  }
                  placeholder="https://api.yourcloud.com/v1/kill-switch"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Auth Header</label>
                <input
                  type="text"
                  value={lockdownConfig.auth_header}
                  onChange={(e) =>
                    setLockdownConfig({ ...lockdownConfig, auth_header: e.target.value })
                  }
                  placeholder="Bearer your-secret-token"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Custom Payload (JSON)</label>
              <textarea
                value={lockdownConfig.payload_json}
                onChange={(e) =>
                  setLockdownConfig({ ...lockdownConfig, payload_json: e.target.value })
                }
                rows={3}
                className="form-input"
                style={{ fontFamily: "monospace", fontSize: "12px" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Compartmentalized Briefings & Drive Releases */}
      {modules.beacon && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <div className="form-section-title" style={{ margin: 0 }}>
              04 // Disclosures & Drive Releases
            </div>
            <button
              type="button"
              onClick={addBeaconRow}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                color: "#38bdf8",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              + Add Disclosure Row
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {beaconRows.map((row, idx) => (
              <div
                key={row.id || idx}
                style={{
                  background: "#0b0f19",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: "11px",
                      color: "#64748b",
                      textTransform: "uppercase",
                    }}
                  >
                    Disclosure Item #{idx + 1}
                  </span>
                  {beaconRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBeaconRow(idx)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#f43f5e",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: "12px" }}>
                  <label className="form-label">Message / Operational Instructions</label>
                  <textarea
                    value={row.content}
                    onChange={(e) => updateBeaconRow(idx, "content", e.target.value)}
                    placeholder="Confidential notes, credentials, or context for attached Drive files..."
                    className="form-input"
                    rows={3}
                  />
                </div>

                {/* Drive Attachments List */}
                <div style={{ marginBottom: "14px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <label className="field-label" style={{ margin: 0 }}>
                      Google Drive Attachments
                    </label>
                    <button
                      type="button"
                      onClick={() => openDrivePicker(idx)}
                      style={{
                        background: "rgba(56, 189, 248, 0.1)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        color: "#38bdf8",
                        padding: "4px 10px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      📎{" "}
                      {row.file_metadata?.length > 0
                        ? `Manage Files (${row.file_metadata.length})`
                        : "Attach Drive Files"}
                    </button>
                  </div>

                  {row.file_metadata?.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        background: "#111622",
                        border: "1px solid #1e293b",
                        borderRadius: "6px",
                        padding: "10px",
                      }}
                    >
                      {row.file_metadata.map((file) => (
                        <div
                          key={file.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            background: "#161b26",
                            border: "1px solid #334155",
                            borderRadius: "4px",
                            padding: "4px 8px",
                            fontSize: "12px",
                            color: "#e2e8f0",
                          }}
                        >
                          {file.iconLink ? (
                            <img
                              src={file.iconLink}
                              alt=""
                              style={{ width: "14px", height: "14px" }}
                            />
                          ) : (
                            <span>📄</span>
                          )}
                          <span
                            style={{
                              maxWidth: "200px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={file.name}
                          >
                            {file.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeDriveFile(idx, file.id)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#94a3b8",
                              cursor: "pointer",
                              fontSize: "13px",
                              padding: "0 2px",
                              lineHeight: 1,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Routing & Clearance */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label">Clearance Tier</label>
                    <select
                      value={row.trust_required}
                      onChange={(e) =>
                        updateBeaconRow(idx, "trust_required", Number(e.target.value))
                      }
                      className="form-select"
                    >
                      <option value={75}>High Clearance (Trust &ge; 75)</option>
                      <option value={50}>Medium Clearance (Trust &ge; 50)</option>
                      <option value={25}>Low Clearance (Trust &ge; 25)</option>
                      <option value={-1}>Designated Sole Recipient (-1)</option>
                    </select>
                  </div>

                  {Number(row.trust_required) === -1 && (
                    <div className="form-group">
                      <label className="form-label">Target Recipient</label>
                      <select
                        value={row.target_contact_id || ""}
                        onChange={(e) =>
                          updateBeaconRow(idx, "target_contact_id", e.target.value)
                        }
                        className="form-select"
                      >
                        <option value="">Choose designated contact...</option>
                        {contactsList.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.contact_name} ({c.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Isolated Heartbeat Telemetry State */}
      <div className="readonly-meta-row">
        <span style={{ color: "#64748b" }}>Active Cycle Anchor:</span>
        <span style={{ color: "#94a3b8" }}>
          Last pulsed{" "}
          {initialSwitch?.last_check_in
            ? new Date(initialSwitch.last_check_in).toLocaleString()
            : "Never"}
        </span>
      </div>

      {/* Buttons */}
      <div className="form-actions">
        <Link href="/dashboard" className="btn-cancel">
          Cancel
        </Link>
        <button type="submit" disabled={saving} className="btn-save">
          {saving ? "Saving Changes..." : "Commit Update"}
        </button>
      </div>

      {/* Google Drive Selector Modal */}
      <GoogleDrivePickerModal
        isOpen={isDriveModalOpen}
        onClose={() => {
          setIsDriveModalOpen(false);
          setActiveDriveRowIndex(null);
        }}
        initialSelected={
          activeDriveRowIndex !== null
            ? beaconRows[activeDriveRowIndex]?.file_metadata || []
            : []
        }
        onConfirm={handleDriveFilesConfirmed}
      />
    </form>
  );
}