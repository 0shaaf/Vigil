'use client';

import { useEffect, useState } from 'react';

const NODE_DATA = {
  l1: {
    tag: '01 // PULSE',
    title: 'Heartbeat Check-In',
    desc: 'Automated periodic check-in pings via email, SMS webhook, or silent API pulse[cite: 1].',
  },
  l2: {
    tag: '02 // VAULT',
    title: 'Zero-Knowledge Vault',
    desc: 'Client-side AES-256 encrypted payload and emergency master key storage[cite: 1].',
  },
  l3: {
    tag: '03 // BUFFER',
    title: 'Escalation Grace Period',
    desc: 'Configurable countdown buffer preventing accidental triggers before dispatch[cite: 1].',
  },
  r1: {
    tag: '04 // DISPATCH',
    title: 'Autonomous Trigger',
    desc: 'Immediate payload release the instant silence exceeds your defined threshold[cite: 1].',
  },
  r2: {
    tag: '05 // DRIVE',
    title: 'Google Drive Sync',
    desc: 'Automated ownership transfer of designated cloud folders upon verification[cite: 1].',
  },
  r3: {
    tag: '06 // CONTACTS',
    title: 'Multi-Tier Beneficiaries',
    desc: 'Selective recipient routing with individual zero-knowledge decryption tokens[cite: 1].',
  },
};

export default function ArchNodes({ scrollStep, onIntroFinish }) {
  const [introRunning, setIntroRunning] = useState(true);

  useEffect(() => {
    // 7.0s: Exact completion timestamp of orbital spin -> mitosis -> string draws -> card fade
    const tIntro = setTimeout(() => {
      setIntroRunning(false);
      if (onIntroFinish) onIntroFinish();
    }, 7000);

    return () => clearTimeout(tIntro);
  }, [onIntroFinish]);

  return (
    <div
      className={`arch-animation-stage ${
        introRunning ? 'intro-running' : `step-mode step-${scrollStep}`
      }`}
      aria-hidden="true"
    >
      <div className="arch-canvas-stage">
        {/* Connective Strings SVG */}
        <svg className="arch-strings-svg" viewBox="0 0 1200 600" fill="none">
          <defs>
            <linearGradient id="tealStringGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#40B3A2" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#40B3A2" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#40B3A2" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Left Arch Path: (220,130) -> (120,300) -> (220,470) */}
          <path
            className="arch-svg-path left-path"
            d="M 220 130 Q 20 300 220 470"
            stroke="url(#tealStringGrad)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Right Arch Path: (980,130) -> (1080,300) -> (980,470) */}
          <path
            className="arch-svg-path right-path"
            d="M 980 130 Q 1180 300 980 470"
            stroke="url(#tealStringGrad)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>

        {/* Central Singularity & Orbit Rotor */}
        <div className="orbit-rotor">
          {/* ================= LEFT WING ================= */}
          <div className="parent-carrier left-carrier">
            {/* L2: Primary Left Parent */}
            <div className="node-pip-anchor l2-pip">
              <div className="node-pip">
                <span className="pip-core" />
                <span className="mitosis-pulse-ring" />
              </div>

              <div className="glass-card left-card">
                <span className="node-tag">{NODE_DATA.l2.tag}</span>
                <h4 className="node-title">{NODE_DATA.l2.title}</h4>
                <div className="node-hover-details">
                  <p className="node-desc">{NODE_DATA.l2.desc}</p>
                </div>
              </div>
            </div>

            {/* L1: Daughter Sprouting Upward */}
            <div className="daughter-node l1-daughter">
              <div className="node-pip">
                <span className="pip-core" />
              </div>
              <div className="glass-card left-card">
                <span className="node-tag">{NODE_DATA.l1.tag}</span>
                <h4 className="node-title">{NODE_DATA.l1.title}</h4>
                <div className="node-hover-details">
                  <p className="node-desc">{NODE_DATA.l1.desc}</p>
                </div>
              </div>
            </div>

            {/* L3: Daughter Sprouting Downward */}
            <div className="daughter-node l3-daughter">
              <div className="node-pip">
                <span className="pip-core" />
              </div>
              <div className="glass-card left-card">
                <span className="node-tag">{NODE_DATA.l3.tag}</span>
                <h4 className="node-title">{NODE_DATA.l3.title}</h4>
                <div className="node-hover-details">
                  <p className="node-desc">{NODE_DATA.l3.desc}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ================= RIGHT WING ================= */}
          <div className="parent-carrier right-carrier">
            {/* R2: Primary Right Parent */}
            <div className="node-pip-anchor r2-pip">
              <div className="node-pip">
                <span className="pip-core" />
                <span className="mitosis-pulse-ring" />
              </div>

              <div className="glass-card right-card">
                <span className="node-tag">{NODE_DATA.r2.tag}</span>
                <h4 className="node-title">{NODE_DATA.r2.title}</h4>
                <div className="node-hover-details">
                  <p className="node-desc">{NODE_DATA.r2.desc}</p>
                </div>
              </div>
            </div>

            {/* R1: Daughter Sprouting Upward */}
            <div className="daughter-node r1-daughter">
              <div className="node-pip">
                <span className="pip-core" />
              </div>
              <div className="glass-card right-card">
                <span className="node-tag">{NODE_DATA.r1.tag}</span>
                <h4 className="node-title">{NODE_DATA.r1.title}</h4>
                <div className="node-hover-details">
                  <p className="node-desc">{NODE_DATA.r1.desc}</p>
                </div>
              </div>
            </div>

            {/* R3: Daughter Sprouting Downward */}
            <div className="daughter-node r3-daughter">
              <div className="node-pip">
                <span className="pip-core" />
              </div>
              <div className="glass-card right-card">
                <span className="node-tag">{NODE_DATA.r3.tag}</span>
                <h4 className="node-title">{NODE_DATA.r3.title}</h4>
                <div className="node-hover-details">
                  <p className="node-desc">{NODE_DATA.r3.desc}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}