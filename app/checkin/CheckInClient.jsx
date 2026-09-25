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

  // Validate the token on initial mount
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

  // Execute pulse and consume token on confirmation
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

  const criticalityColor =
    switchInfo?.criticality === "CRITICAL"
      ? "text-rose-400 border-rose-500/30 bg-rose-500/10"
      : switchInfo?.criticality === "SENTINEL"
      ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
      : "text-sky-400 border-sky-500/30 bg-sky-500/10";

  return (
    <div className="w-full max-w-md bg-[#0d111a] border border-slate-800 rounded-xl p-6 sm:p-8 shadow-2xl shadow-black/80 font-mono">
      {/* Sentinel Terminal Status Header */}
      <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              successData
                ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                : errorMsg
                ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]"
                : "bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse"
            }`}
          />
          <span>Vigil // Auth Gateway</span>
        </div>
        <span className="text-slate-600">v1.0.4</span>
      </div>

      {/* 1. Loading State */}
      {loading && (
        <div className="py-12 text-center text-slate-400 text-xs">
          <div className="inline-block w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p>Validating cryptographic token signature...</p>
        </div>
      )}

      {/* 2. Error / Expired / Invalid State */}
      {!loading && errorMsg && (
        <div>
          <div className="p-4 mb-6 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed">
            <div className="font-bold text-rose-400 mb-1 flex items-center gap-1.5 uppercase tracking-wide">
              <span>✕</span> Authorization Error
            </div>
            {errorMsg}
          </div>
          <Link
            href="/dashboard"
            className="block w-full py-2.5 px-4 text-center rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold tracking-wide transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      )}

      {/* 3. Success State */}
      {!loading && successData && (
        <div className="text-center py-2">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            ✓
          </div>
          <h2 className="text-lg font-bold text-white tracking-wide mb-1 font-sans">
            Heartbeat Acknowledged
          </h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed font-sans">
            The switch interval has been reset to full duration. All automated disclosures and autonomous fail-safes remain disarmed.
          </p>

          <div className="p-3 mb-6 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Timestamp:</span>
              <span className="text-slate-300">
                {new Date(successData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="text-emerald-400">DISARMED & ARMED</span>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="block w-full py-3 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-sky-950/40"
          >
            Access Security Console
          </Link>
        </div>
      )}

      {/* 4. Active Confirmation Prompt */}
      {!loading && !errorMsg && !successData && switchInfo && (
        <div>
          <div className="mb-5">
            <h1 className="text-base font-bold text-white tracking-tight mb-1 font-sans">
              Confirm Heartbeat Pulse
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Acknowledge your presence to disarm automated disclosures and reset the timer.
            </p>
          </div>

          {/* Switch Diagnostic Card */}
          <div className="p-4 mb-6 rounded-lg bg-slate-900/80 border border-slate-800 text-xs space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Target Switch</span>
              <span className="font-semibold text-slate-100">{switchInfo.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Criticality</span>
              <span className={`text-[10px] uppercase px-2 py-0.5 rounded border font-semibold ${criticalityColor}`}>
                {switchInfo.criticality || "OPERATIONAL"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Purpose</span>
              <span className="text-slate-300 text-[11px] uppercase">
                {switchInfo.purpose || "PERSONAL"}
              </span>
            </div>
            {expiresAt && (
              <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center">
                <span className="text-slate-500">Expires At</span>
                <span className="text-amber-400 text-[11px]">
                  {new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(expiresAt).toLocaleDateString()})
                </span>
              </div>
            )}
          </div>

          {/* Verification CTA */}
          <button
            type="button"
            onClick={handlePulse}
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-sky-900/50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider transition-all duration-150 shadow-lg shadow-sky-950/60 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Transmitting Pulse...</span>
              </>
            ) : (
              <span>Confirm Pulse & Reset Timer</span>
            )}
          </button>

          <p className="mt-4 text-[10px] text-center text-slate-600 tracking-wide font-sans">
            Single-use cryptographic action token. Consuming this invalidates the URL immediately.
          </p>
        </div>
      )}
    </div>
  );
}