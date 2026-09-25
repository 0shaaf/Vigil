"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function CheckInClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [switchInfo, setSwitchInfo] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    if (!token) {
      setErrorMsg("Missing authorization token. Check the link provided in your notification.");
      setLoading(false);
      return;
    }

    async function verifyToken() {
      try {
        const res = await fetch(`/api/checkin?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok || !data.valid) {
          setErrorMsg(data.error || "Token verification rejected.");
        } else {
          setSwitchInfo(data.switch);
          setExpiresAt(data.expiresAt);
        }
      } catch (err) {
        setErrorMsg("Failed to reach verification gateway. Check your connection.");
      } finally {
        setLoading(false);
      }
    }

    verifyToken();
  }, [token]);

  const handlePulse = async () => {
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Heartbeat transmission rejected by server.");
      } else {
        setSuccessData(data);
      }
    } catch (err) {
      setErrorMsg("Network timeout while attempting to pulse switch.");
    } finally {
      setSubmitting(false);
    }
  };

  const getCriticalityClass = () => {
    if (switchInfo?.criticality === "CRITICAL") return "critical";
    if (switchInfo?.criticality === "SENTINEL") return "sentinel";
    return "operational";
  };

  const getStatusDotClass = () => {
    if (successData) return "success";
    if (errorMsg) return "error";
    return "pending";
  };

  return (
    <div className="checkin-card">
      {/* Terminal Header */}
      <div className="checkin-header">
        <div className="checkin-status">
          <span className={`status-dot ${getStatusDotClass()}`} />
          <span>Vigil // Auth Gateway</span>
        </div>
        <span className="header-version">v1.0.4</span>
      </div>

      {/* 1. Loading State */}
      {loading && (
        <div className="checkin-loading">
          <div className="loading-spinner" />
          <p>Validating cryptographic token signature...</p>
        </div>
      )}

      {/* 2. Error State */}
      {!loading && errorMsg && (
        <div>
          <div className="checkin-error-box">
            <div className="error-title">✕ Authorization Error</div>
            {errorMsg}
          </div>
          <Link href="/dashboard" className="btn-secondary">
            Return to Operator Dashboard
          </Link>
        </div>
      )}

      {/* 3. Success State */}
      {!loading && successData && (
        <div className="success-terminal">
          <div className="success-glyph">✓</div>
          <h2 className="terminal-title">Heartbeat Acknowledged</h2>
          <p className="terminal-desc">
            The switch interval has been reset to full duration. Autonomous fail-safes and disclosures remain disarmed.
          </p>

          <div className="meta-box">
            <div className="meta-row">
              <span className="meta-label">Timestamp:</span>
              <span className="meta-val">
                {new Date(successData.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Status:</span>
              <span className="status-active">DISARMED & ARMED</span>
            </div>
          </div>

          <Link href="/dashboard" className="btn-primary">
            Access Security Console
          </Link>
        </div>
      )}

      {/* 4. Active Confirmation Prompt */}
      {!loading && !errorMsg && !successData && switchInfo && (
        <div>
          <div className="prompt-header">
            <h1 className="prompt-title">Confirm Heartbeat Pulse</h1>
            <p className="prompt-desc">
              Acknowledge your presence to disarm automated disclosures and reset the timer.
            </p>
          </div>

          <div className="diagnostic-card">
            <div className="diagnostic-row">
              <span className="diag-label">Target Switch</span>
              <span className="diag-name">{switchInfo.name}</span>
            </div>
            <div className="diagnostic-row">
              <span className="diag-label">Criticality</span>
              <span className={`criticality-badge ${getCriticalityClass()}`}>
                {switchInfo.criticality || "OPERATIONAL"}
              </span>
            </div>
            <div className="diagnostic-row">
              <span className="diag-label">Domain</span>
              <span className="diag-purpose">{switchInfo.purpose || "PERSONAL"}</span>
            </div>
            {expiresAt && (
              <div className="diagnostic-row bordered">
                <span className="diag-label">Expires At</span>
                <span className="diag-expiry">
                  {new Date(expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} (
                  {new Date(expiresAt).toLocaleDateString()})
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handlePulse}
            disabled={submitting}
            className="btn-pulse"
          >
            {submitting ? (
              <>
                <span className="btn-spinner" />
                <span>Transmitting Pulse...</span>
              </>
            ) : (
              <span>Confirm Pulse & Reset Timer</span>
            )}
          </button>

          <p className="terminal-note">
            Single-use cryptographic action token. Consuming this invalidates the URL immediately.
          </p>
        </div>
      )}
    </div>
  );
}