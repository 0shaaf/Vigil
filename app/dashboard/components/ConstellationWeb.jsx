"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { triggerHeartbeat } from "../../actions/switches";
import "../css/dashboard.css";

export default function ConstellationWeb({ switches = [] }) {
  const router = useRouter();
  const containerRef = useRef(null);

  const [dimensions, setDimensions] = useState({ width: 1000, height: 700 });
  const [hoveredSwitch, setHoveredSwitch] = useState(null);
  const [pulseActive, setPulseActive] = useState(false);
  const [heartbeatStatus, setHeartbeatStatus] = useState("");
  const [offsets, setOffsets] = useState([]);

  // Resize listener
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Float animation loop
  useEffect(() => {
    let animationFrameId;
    let time = 0;

    const animate = () => {
      time += 0.02;
      const newOffsets = switches.map((_, i) => ({
        dx: Math.sin(time + i * 1.5) * 12,
        dy: Math.cos(time * 0.8 + i * 2) * 12,
      }));
      setOffsets(newOffsets);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [switches]);

  const cx = dimensions.width / 2;
  const cy = dimensions.height / 2;
  const orbitRadius = Math.min(cx, cy) * 0.65;

  const handleHeartbeat = async () => {
    setPulseActive(true);
    setHeartbeatStatus("Transmitting heartbeat...");

    const err = await triggerHeartbeat();
    if (!err) {
      setHeartbeatStatus("All Switches Renewed");
      setTimeout(() => setHeartbeatStatus(""), 3000);
    } else {
      setHeartbeatStatus("Heartbeat Failed");
    }

    setTimeout(() => setPulseActive(false), 800);
  };

  return (
    <div ref={containerRef} className="constellation-viewport">
      {/* 1. Header positioned inside the constellation viewport */}
      <header className="constellation-header">
        <h1 className="constellation-title">Fail-Safe Constellation</h1>
        <p className="constellation-subtitle">
          Central heartbeat is linked to all operational dead man's switches.
        </p>
      </header>

      {/* 2. Constellation SVG Canvas */}
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="constellation-svg"
      >
        <defs>
          {/* Mask Pattern: Defines the stationary dots */}
          <pattern
            id="dotPattern"
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.5" fill="#ffffff" />
          </pattern>

          {/* SVG Mask: forces everything inside it to only render on the dots */}
          <mask id="dotsMask">
            <rect width="100%" height="100%" fill="url(#dotPattern)" />
          </mask>

          {/* Wave Gradient: Sweeps from left to right */}
          <linearGradient id="waveBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
            <stop offset="30%" stopColor="#ef4444" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#ff4d4d" stopOpacity="1" />
            <stop offset="70%" stopColor="#ef4444" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>

          {/* Center Glow Field */}
          <radialGradient id="coreGlow">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Solid Background */}
        <rect width="100%" height="100%" fill="#07090e" />

        {/* Dotted Grid Group: Masked so only dots light up */}
        <g mask="url(#dotsMask)">
          {/* Layer A: Base dots that pulse impulsively between mild and vivid red */}
          <rect
            width="100%"
            height="100%"
            fill="#ef4444"
            className="impulsive-dots-base"
          />

          {/* Layer B: Animated beam sweeping horizontally across the dots */}
          <rect
            y="0"
            width="450"
            height="100%"
            fill="url(#waveBeamGrad)"
            className="grid-wave-beam"
          />
        </g>

        {/* Orbit track */}
        <circle
          cx={cx}
          cy={cy}
          r={orbitRadius}
          className="constellation-orbit"
        />

        {/* Spiderweb threads connecting center to nodes */}
        {switches.map((sw, index) => {
          const total = switches.length;
          const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
          const drift = offsets[index] || { dx: 0, dy: 0 };
          const x = cx + orbitRadius * Math.cos(angle) + drift.dx;
          const y = cy + orbitRadius * Math.sin(angle) + drift.dy;

          const isHovered = hoveredSwitch?.id === sw.id;

          let threadClass = "constellation-thread";
          if (isHovered) threadClass += " is-hovered";
          else if (pulseActive) threadClass += " is-pulsing";

          return (
            <line
              key={`line-${sw.id}`}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              className={threadClass}
            />
          );
        })}

        {/* Central Ambient Glow */}
        <circle cx={cx} cy={cy} r={orbitRadius * 0.45} fill="url(#coreGlow)" />

        {/* Switch Nodes */}
        {switches.map((sw, index) => {
          const total = switches.length;
          const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
          const drift = offsets[index] || { dx: 0, dy: 0 };
          const x = cx + orbitRadius * Math.cos(angle) + drift.dx;
          const y = cy + orbitRadius * Math.sin(angle) + drift.dy;

          return (
            <g
              key={`node-${sw.id}`}
              transform={`translate(${x}, ${y})`}
              className="switch-node"
              onMouseEnter={() => setHoveredSwitch(sw)}
              onMouseLeave={() => setHoveredSwitch(null)}
              onClick={() => router.push(`/dashboard/switches/${sw.id}`)}
            >
              <circle r={22} className="switch-node-halo" />
              <circle r={4} className="switch-node-pip" />
              <text y={38} className="switch-node-label">
                {sw.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Central Heartbeat Trigger Core */}
      <div
        className="heartbeat-container"
        style={{ top: `${cy}px`, left: `${cx}px` }}
      >
        <button
          onClick={handleHeartbeat}
          className={`heartbeat-button ${pulseActive ? "is-active" : ""}`}
        >
          <span className="heartbeat-icon">❤️</span>
          <span className="heartbeat-label">CHECK IN</span>
        </button>

        {heartbeatStatus && (
          <span className="heartbeat-feedback">{heartbeatStatus}</span>
        )}
      </div>

      {/* Tooltip Card */}
      {hoveredSwitch && (
        <div className="switch-tooltip-card">
          <span className="tooltip-title">{hoveredSwitch.name}</span>
          <div>
            Interval:{" "}
            <span className="tooltip-meta">
              {hoveredSwitch.check_in_interval?.days ? `${hoveredSwitch.check_in_interval.days}d ` : ""}
              {hoveredSwitch.check_in_interval?.hours ? `${hoveredSwitch.check_in_interval.hours}h ` : ""}
              {hoveredSwitch.check_in_interval?.minutes ? `${hoveredSwitch.check_in_interval.minutes}m` : ""}
            </span>
          </div>
          <div>
            Last Pulse:{" "}
            <span className="tooltip-meta">
              {hoveredSwitch.last_check_in
                ? new Date(hoveredSwitch.last_check_in).toLocaleDateString()
                : "Never"}
            </span>
          </div>
          <span className="tooltip-link-hint">Click node to configure ↗</span>
        </div>
      )}
    </div>
  );
}