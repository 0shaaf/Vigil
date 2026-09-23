"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOutUser } from "../../lib/supabase/auth/client-auth";
import "../css/Sidebar.css";

export default function Sidebar({ userEmail = "operator" }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutUser();
    router.push("/");
    router.refresh();
  };

  const isExactActive = (href) => pathname === href;
  const isNestedActive = (href) => pathname.startsWith(href);

  return (
    <div className="sidebar-gutter">
      <aside className="sidebar-panel">
        {/* Brand Header */}
        <div>
          <Link href="/dashboard" className="sidebar-brand">
            <div className="brand-icon-box">V</div>
            <span className="brand-name">VIGIL</span>
          </Link>

          {/* Docks */}
          <nav className="sidebar-nav-container">
            {/* Dock 1: Operations */}
            <div className="sidebar-dock">
              <span className="dock-label">Operations</span>

              <Link
                href="/dashboard"
                className={`sidebar-item ${isExactActive("/dashboard") ? "is-active" : ""}`}
                title="Constellation Web"
              >
                <div className="item-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <circle cx="4" cy="6" r="2" />
                    <circle cx="20" cy="6" r="2" />
                    <circle cx="7" cy="19" r="2" />
                    <circle cx="17" cy="19" r="2" />
                    <line x1="6" y1="7" x2="10" y2="10" />
                    <line x1="18" y1="7" x2="14" y2="10" />
                    <line x1="8" y1="17" x2="11" y2="14" />
                    <line x1="16" y1="17" x2="13" y2="14" />
                  </svg>
                </div>
                <span className="item-label">Constellation</span>
              </Link>

              <Link
                href="/dashboard/switches"
                className={`sidebar-item ${isNestedActive("/dashboard/switches") ? "is-active" : ""}`}
                title="Fail-Safe Switches"
              >
                <div className="item-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="6" width="20" height="12" rx="6" />
                    <circle cx="8" cy="12" r="3" fill="currentColor" />
                  </svg>
                </div>
                <span className="item-label">Switches</span>
              </Link>

              <Link
                href="/dashboard/contacts"
                className={`sidebar-item ${isNestedActive("/dashboard/contacts") ? "is-active" : ""}`}
                title="Trusted Contacts"
              >
                <div className="item-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <span className="item-label">Contacts</span>
              </Link>
            </div>

            {/* Dock 2: Telemetry / Logs */}
            <div className="sidebar-dock">
              <span className="dock-label">Telemetry</span>

              <Link
                href="/dashboard/logs"
                className={`sidebar-item ${isNestedActive("/dashboard/logs") ? "is-active" : ""}`}
                title="Escalation Logs"
              >
                <div className="item-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                    <polyline points="13 2 13 9 20 9" />
                    <line x1="8" y1="13" x2="16" y2="13" />
                    <line x1="8" y1="17" x2="12" y2="17" />
                  </svg>
                </div>
                <span className="item-label">Escalation Logs</span>
              </Link>
            </div>
          </nav>
        </div>

        {/* Dock 3: User & Power */}
        <div className="sidebar-bottom-dock">
          <div className="user-profile-badge" title={userEmail}>
            <div className="user-avatar">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <span className="user-email-text">{userEmail}</span>
          </div>

          <button
            onClick={handleSignOut}
            className="sidebar-item signout-button"
            title="Terminate Session"
          >
            <div className="item-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <span className="item-label">Log Out</span>
          </button>
        </div>
      </aside>
    </div>
  );
}