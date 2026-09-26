import React from "react";
import Link from "next/link";
import { Radio, Share2, Trash2, Lock } from "lucide-react";
import "../css/switch-card.css";

function getCountdown(lastCheckIn, interval) {
  if (!lastCheckIn) return "Awaiting Pulse";
  const target = new Date(lastCheckIn);
  if (interval?.months) target.setMonth(target.getMonth() + Number(interval.months));
  if (interval?.days) target.setDate(target.getDate() + Number(interval.days));
  if (interval?.hours) target.setHours(target.getHours() + Number(interval.hours));
  if (interval?.minutes) target.setMinutes(target.getMinutes() + Number(interval.minutes));

  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return "EXPIRED";

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m remaining`;
}

export default function SwitchCard({ switchData }) {
  const countdown = getCountdown(switchData.last_check_in, switchData.check_in_interval);
  const actions = switchData.actions || {};
  const modules = actions.modules || {
    beacon: actions.email ?? true,
    data_release: false,
    purge: false,
    lockdown: false,
  };

  return (
    <Link
      href={`/dashboard/switches/${switchData.id}`}
      className="switch-card-outer"
      title={`Configure ${switchData.name}`}
    >
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

        {/* Hero Stack */}
        <div className="hud-center">
          <h2 className="hud-card-name">{switchData.name}</h2>
          
          <div className="hud-countdown-subtext">
            {countdown === "EXPIRED" ? (
              <span className="expired">TRIGGER // EXPIRED</span>
            ) : countdown === "Awaiting Pulse" ? (
              <span>AWAITING PULSE</span>
            ) : (
              <span>
                TRIGGERS IN <span className="highlight">{countdown}</span>
              </span>
            )}
          </div>

          <div className="hero-embedded-capsule">
            <span className="capsule-tier">
              {switchData.criticality || "OPERATIONAL"}
            </span>
            <span className="capsule-divider" />
            <span className="capsule-purpose">
              {switchData.purpose || "PERSONAL"}
            </span>
          </div>
        </div>

        {/* Centered Bottom Tray with Increased Lucide Icons */}
        <div className="hud-footer">
          <div className="hud-modules">
            <span
              className={`module-icon-pip ${modules.beacon ? "active" : ""}`}
              title="Emergency Beacon"
            >
              <Radio size={14} strokeWidth={2} />
            </span>
            <span
              className={`module-icon-pip ${modules.data_release ? "active" : ""}`}
              title="Data Release"
            >
              <Share2 size={14} strokeWidth={2} />
            </span>
            <span
              className={`module-icon-pip ${modules.purge ? "active" : ""}`}
              title="Destructive Purge"
            >
              <Trash2 size={14} strokeWidth={2} />
            </span>
            <span
              className={`module-icon-pip ${modules.lockdown ? "active" : ""}`}
              title="Lockdown Webhook"
            >
              <Lock size={14} strokeWidth={2} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}