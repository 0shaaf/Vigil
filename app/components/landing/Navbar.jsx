'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="flush-navbar">
      <div className="nav-inner">
        {/* Brand Terminal Callout */}
        <Link href="/" className="brand-link">
          <span className="brand-dot" />
          <span className="brand-title">VIGIL</span>
          <span className="brand-system-tag">FAILSAFE_DAEMON // V2.4</span>
        </Link>

        {/* Center Nav Options */}
        <nav className="nav-links">
          <a href="#protocol" className="nav-item">Protocol</a>
          <a href="#vault" className="nav-item">Encrypted Vault</a>
          <a href="#telemetry" className="nav-item">Escalation</a>
        </nav>

        {/* Actions */}
        <div className="nav-actions">
          <Link href="/checkin" className="nav-btn-hollow">
            Check-In Pulse
          </Link>
          <Link href="/dashboard" className="nav-btn-solid">
            Open Terminal
          </Link>
        </div>
      </div>
    </header>
  );
}