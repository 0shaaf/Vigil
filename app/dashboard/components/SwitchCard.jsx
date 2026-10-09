"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Radio, Lock, Activity, Pause, Play, RefreshCw, ArrowUpRight } from "lucide-react";
import { checkInSingleSwitch, rearmSwitch } from "@/app/actions/switches";
import "../css/switch-card.css";

function calculateTimeLeft(lastCheckIn, interval) {
  if (!lastCheckIn) return { label: "Awaiting Pulse", expired: false, diffMs: null };
  const target = new Date(lastCheckIn);
  if (interval?.months) target.setMonth(target.getMonth() + Number(interval.months));
  if (interval?.days) target.setDate(target.getDate() + Number(interval.days));
  if (interval?.hours) target.setHours(target.getHours() + Number(interval.hours));
  if (interval?.minutes) target.setMinutes(target.getMinutes() + Number(interval.minutes));

  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return { label: "TRIPPED", expired: true, diffMs: 0 };

  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;

  if (days > 0) return { label: `${days}d ${hours}h ${minutes}m`, expired: false, diffMs };
  if (hours > 0) return { label: `${hours}h ${minutes}m ${seconds}s`, expired: false, diffMs };
  return { label: `${minutes}m ${seconds}s`, expired: false, diffMs };
}

export default function SwitchCard({ switchData }) {
  const router = useRouter();
  const [pulseLoading, setPulseLoading] = useState(false);
  const [pulseSuccess, setPulseSuccess] = useState(false);
  const [countdown, setCountdown] = useState(() =>
    calculateTimeLeft(switchData.last_check_in, switchData.check_in_interval)
  );

  // Live countdown ticker every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(calculateTimeLeft(switchData.last_check_in, switchData.check_in_interval));
    }, 1000);
    return () => clearInterval(timer);
  }, [switchData.last_check_in, switchData.check_in_interval]);

  const handlePulse = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setPulseLoading(true);

    try {
      if (switchData.status === "EXHAUSTED" || switchData.status === "ACKNOWLEDGED") {
        await rearmSwitch(switchData.id);
      } else {
        await checkInSingleSwitch(switchData.id);
      }
      setPulseSuccess(true);
      setTimeout(() => setPulseSuccess(false), 2500);
      router.refresh();
    } catch (err) {
      console.error("[SwitchCard Pulse Error]:", err);
    } finally {
      setPulseLoading(false);
    }
  };

  const actions = switchData.actions || {};
  const modules = actions.modules || {
    beacon: actions.email ?? true,
    lockdown: false,
  };

  // Status mapping per BACKEND_API_SPEC.md 4.2
  const status = switchData.status?.toUpperCase() || "ARMED";
  const statusBadge = {
    ARMED: { label: "ARMED", colorClass: "badge-armed" },
    ESCALATING: { label: "ESCALATING", colorClass: "badge-escalating" },
    EXHAUSTED: { label: "TRIPPED", colorClass: "badge-exhausted" },
    ACKNOWLEDGED: { label: "HALTED (ACK)", colorClass: "badge-ack" },
    PAUSED: { label: "STANDBY", colorClass: "badge-paused" },
  }[status] || { label: status, colorClass: "badge-armed" };

  return (
    <div className={`switch-card-outer status-${status.toLowerCase()}`}>
      {/* Moving Orbit Dot */}
      <div className="switch-card-dot" />

      <div className="switch-card-inner">
        {/* Slanted Light Ray Effect */}
        <div className="switch-card-ray" />

        {/* HUD Reticle Boundary Lines */}
        <div className="reticle-line topl" />
        <div className="reticle-line leftl" />
        <div className="reticle-line bottoml" />
        <div className="reticle-line rightl" />

        {/* Card Header: Status & Criticality Badges */}
        <div className="switch-card-topbar">
          <span className={`switch-status-pill ${statusBadge.colorClass}`}>
            <span className="status-dot" />
            <span>{statusBadge.label}</span>
          </span>

          <span className="switch-criticality-pill">
            {switchData.criticality || "OPERATIONAL"}
          </span>
        </div>

        {/* Hero Content Stack */}
        <Link
          href={`/dashboard/switches/${switchData.id}`}
          className="hud-center-link"
          title={`Configure ${switchData.name}`}
        >
          <h2 className="hud-card-name">{switchData.name}</h2>
          
          <div className="hud-countdown-subtext">
            {countdown.expired ? (
              <span className="expired">TRIGGER • EXPIRED</span>
            ) : countdown.label === "Awaiting Pulse" ? (
              <span>AWAITING INITIAL PULSE</span>
            ) : (
              <span>
                TRIGGERS IN <span className="highlight">{countdown.label}</span>
              </span>
            )}
          </div>

          <div className="hero-embedded-capsule">
            <span className="capsule-purpose">
              {switchData.purpose || "PERSONAL"}
            </span>
            <span className="capsule-divider" />
            <span className="capsule-interval">
              {switchData.check_in_interval?.days ? `${switchData.check_in_interval.days}d ` : ""}
              {switchData.check_in_interval?.hours ? `${switchData.check_in_interval.hours}h ` : ""}
              {switchData.check_in_interval?.minutes ? `${switchData.check_in_interval.minutes}m` : ""}
            </span>
          </div>
        </Link>

        {/* Card Action Tray */}
        <div className="hud-footer">
          {/* Active Module Indicators */}
          <div className="hud-modules">
            <span
              className={`module-icon-pip ${modules.beacon ? "active" : ""}`}
              title="Emergency Beacon"
            >
              <Radio size={13} strokeWidth={2} />
            </span>
            <span
              className={`module-icon-pip ${modules.lockdown ? "active" : ""}`}
              title="Lockdown Webhook"
            >
              <Lock size={13} strokeWidth={2} />
            </span>
          </div>

          {/* Quick Pulse / Re-arm Button */}
          <div className="hud-card-actions">
            <button
              onClick={handlePulse}
              disabled={pulseLoading}
              className={`btn-card-pulse ${pulseSuccess ? "pulse-success" : ""}`}
              title={status === "EXHAUSTED" ? "Re-arm Switch" : "Check-in Heartbeat Pulse"}
            >
              <Activity size={12} className={pulseLoading ? "animate-spin" : ""} />
              <span>
                {pulseSuccess
                  ? "PULSED"
                  : pulseLoading
                  ? "..."
                  : status === "EXHAUSTED"
                  ? "RE-ARM"
                  : "CHECK IN"}
              </span>
            </button>

            <Link
              href={`/dashboard/switches/${switchData.id}`}
              className="btn-card-configure"
              title="Configure Switch"
            >
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}