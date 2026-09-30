'use client';

import { useMemo } from 'react';
import '../CSS/dial.css';

const NODES = [
  {
    id: 0,
    tag: '01 // PULSE',
    title: 'Heartbeat Check-In',
    desc: 'Autonomous heartbeat pings dispatched to your endpoint. Confirm your presence securely with a single tap[cite: 1].',
    badge: 'AES-256 ZERO-KNOWLEDGE[cite: 1]',
  },
  {
    id: 1,
    tag: '02 // VAULT',
    title: 'Client-Side Vault',
    desc: 'Master credentials, private keys, and secrets stored encrypted. Decrypted only when escalation triggers[cite: 1].',
    badge: 'END-TO-END ENCRYPTED[cite: 1]',
  },
  {
    id: 2,
    tag: '03 // BUFFER',
    title: 'Escalation Grace Period',
    desc: 'Configurable countdown buffer preventing false alarms. Dispatches urgent alerts before releasing data[cite: 1].',
    badge: 'FAILSAFE DELAY WINDOW[cite: 1]',
  },
  {
    id: 3,
    tag: '04 // DISPATCH',
    title: 'Autonomous Trigger',
    desc: 'Uncompromising execution. The moment the silence threshold is crossed, your recovery sequence executes[cite: 1].',
    badge: 'IRREVERSIBLE DISPATCH[cite: 1]',
  },
  {
    id: 4,
    tag: '05 // DRIVE',
    title: 'Google Drive Sync',
    desc: 'Designated Google Drive archives, folders, and documents automatically transfer ownership upon activation[cite: 1].',
    badge: 'CLOUD ARCHIVE MIRROR[cite: 1]',
  },
  {
    id: 5,
    tag: '06 // CONTACTS',
    title: 'Multi-Tier Beneficiaries',
    desc: 'Split critical secrets among trusted individuals. Specific beneficiaries receive only designated archives[cite: 1].',
    badge: 'GRANULAR SHARD ACCESS[cite: 1]',
  },
];

export default function RadialVaultDial({ activeNodeIndex, isZoomed, isIntroDone }) {
  // Radius of the resting ring (175px desktop)
  const RADIUS = 175;

  // The angle each node sits on the circle:
  // Node 0 sits at -90deg (12 o'clock top), Node 1 at -30deg (2 o'clock), etc.
  const nodePositions = useMemo(() => {
    return NODES.map((node, i) => {
      const angleDeg = i * 60 - 90;
      const angleRad = (angleDeg * Math.PI) / 180;
      return {
        ...node,
        x: RADIUS * Math.cos(angleRad),
        y: RADIUS * Math.sin(angleRad),
        baseAngle: angleDeg,
      };
    });
  }, [RADIUS]);

  // To bring activeNodeIndex to 12 o'clock (-90deg), rotate dial by -activeNodeIndex * 60deg
  const turntableRotation = -(activeNodeIndex * 60);

  return (
    <div className={`dial-stage-wrapper ${isIntroDone ? 'intro-settled' : 'intro-playing'}`}>
      {/* Camera Rig: Handles the 3.8x zoom & downward translation */}
      <div className={`dial-camera-rig ${isZoomed ? 'view-zoomed' : 'view-overview'}`}>
        
        {/* The Turntable: Rotates 60deg each step to park the next node at 12 o'clock */}
        <div
          className="dial-turntable"
          style={{ transform: `rotate(${turntableRotation}deg)` }}
        >
          {/* SVG Circular Ring Arc */}
          <svg className="dial-svg-ring" viewBox="0 0 450 450" fill="none">
            <defs>
              <linearGradient id="ringGlowTeal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#40B3A2" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#256e63" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#40B3A2" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <circle
              className="ring-circle-path"
              cx="225"
              cy="225"
              r={RADIUS}
              stroke="url(#ringGlowTeal)"
              strokeWidth="2"
              strokeDasharray="4 8"
            />
          </svg>

          {/* Central Radial Halo */}
          <div className="dial-center-halo" />

          {/* 6 Nodes Positioned around the circle */}
          {nodePositions.map((node) => {
            const isCurrentActive = node.id === activeNodeIndex;

            return (
              <div
                key={node.id}
                className={`dial-node-anchor ${isCurrentActive ? 'is-active-top' : ''}`}
                style={{
                  transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
                }}
              >
                {/* Counter-Rotate so card & pips remain upright */}
                <div
                  className="node-counter-pivot"
                  style={{
                    transform: `rotate(${-turntableRotation}deg)`,
                  }}
                >
                  {/* Pip Marker */}
                  <div className="node-pip-housing">
                    <span className="pip-core-dot" />
                  </div>

                  {/* Overview Minimal Label */}
                  <span className="overview-pip-label">{node.tag}</span>

                  {/* Inspection Glass Card: Expands only on active zoomed node */}
                  <div className="node-glass-panel">
                    <span className="card-tag">{node.tag}</span>
                    <h3 className="card-title">{node.title}</h3>
                    <p className="card-desc">{node.desc}</p>
                    <span className="card-badge">
                      <span>✦</span> {node.badge}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}