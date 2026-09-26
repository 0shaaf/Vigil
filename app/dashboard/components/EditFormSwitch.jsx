"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateSwitch } from "@/app/actions/switches"; // Adjust to your server action import path

export default function EditFormSwitch({ initialSwitch }) {
  const router = useRouter();

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

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  const toggleModule = (moduleKey) => {
    setModules((prev) => ({ ...prev, [moduleKey]: !prev[moduleKey] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg({ type: "", text: "" });

    // Validate that at least one interval unit is greater than zero
    if (months === 0 && days === 0 && hours === 0 && minutes === 0) {
      setStatusMsg({ type: "error", text: "Countdown interval must be greater than 0 minutes." });
      setSaving(false);
      return;
    }

    try {
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
        },
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
      </div>

      {/* 4. Isolated Heartbeat Telemetry State */}
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
    </form>
  );
}