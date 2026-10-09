"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Network, 
  Radio, 
  Users, 
  ScrollText, 
  HardDrive, 
  LogOut, 
  Menu, 
  X 
} from "lucide-react";
import SentinelVector from "@/components/landing/SentinelVector";
import { signOutUser } from "../../lib/supabase/auth/client-auth";
import "../css/Sidebar.css";

export default function Sidebar({
  userEmail = "operator",
  userName,
  userProfession,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOutUser();
    router.push("/login");
    router.refresh();
  };

  const isExactActive = (href) => pathname === href;
  const isNestedActive = (href) => pathname.startsWith(href);

  return (
    <>
      {/* Mobile Top Header */}
      <header className="dashboard-mobile-header">
        <Link href="/dashboard" className="mobile-brand">
          <div className="mobile-brand-icon">
            <SentinelVector
              className="w-5 h-5 object-contain"
              primaryColor="#ff3b19"
              secondaryColor="#ffffff"
            />
          </div>
          <span className="mobile-brand-title">VIGIL</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="mobile-menu-btn"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Sidebar Desktop Gutter & Responsive Drawer */}
      <div className={`sidebar-gutter ${mobileOpen ? "mobile-open" : ""}`}>
        <aside className="sidebar-panel">
          <div>
            {/* Brand Header */}
            <Link href="/" className="sidebar-brand" title="View Vigil Landing">
              <div className="brand-icon-box">
                <SentinelVector
                  className="w-6 h-6 object-contain"
                  primaryColor="#ff3b19"
                  secondaryColor="#ffffff"
                />
              </div>
              <div className="brand-text-container">
                <span className="brand-name">VIGIL</span>
              </div>
            </Link>

            {/* Navigation Docks */}
            <nav className="sidebar-nav-container">
              {/* Dock 1: Operations */}
              <div className="sidebar-dock">
                <span className="dock-label">Operations</span>

                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className={`sidebar-item ${isExactActive("/dashboard") ? "is-active" : ""}`}
                  title="Constellation Web"
                >
                  <div className="item-icon">
                    <Network size={18} />
                  </div>
                  <span className="item-label">Constellation</span>
                </Link>

                <Link
                  href="/dashboard/switches"
                  onClick={() => setMobileOpen(false)}
                  className={`sidebar-item ${isNestedActive("/dashboard/switches") ? "is-active" : ""}`}
                  title="Fail-Safe Switches"
                >
                  <div className="item-icon">
                    <Radio size={18} />
                  </div>
                  <span className="item-label">Switches</span>
                </Link>

                <Link
                  href="/dashboard/contacts"
                  onClick={() => setMobileOpen(false)}
                  className={`sidebar-item ${isNestedActive("/dashboard/contacts") ? "is-active" : ""}`}
                  title="Contactbook"
                >
                  <div className="item-icon">
                    <Users size={18} />
                  </div>
                  <span className="item-label">Contactbook</span>
                </Link>
              </div>

              {/* Dock 2: Telemetry / Vault */}
              <div className="sidebar-dock">
                <span className="dock-label">Telemetry</span>

                <Link
                  href="/dashboard/logs"
                  onClick={() => setMobileOpen(false)}
                  className={`sidebar-item ${isNestedActive("/dashboard/logs") ? "is-active" : ""}`}
                  title="Escalation Logs"
                >
                  <div className="item-icon">
                    <ScrollText size={18} />
                  </div>
                  <span className="item-label">Audit Logs</span>
                </Link>

                <Link
                  href="/dashboard/drive"
                  onClick={() => setMobileOpen(false)}
                  className={`sidebar-item ${isNestedActive("/dashboard/drive") ? "is-active" : ""}`}
                  title="Drive Asset Vault"
                >
                  <div className="item-icon">
                    <HardDrive size={18} />
                  </div>
                  <span className="item-label">Drive Vault</span>
                </Link>
              </div>
            </nav>
          </div>

          {/* Dock 4: Operator & Session */}
          <div className="sidebar-bottom-dock">
            <div className="user-profile-badge" title={userEmail}>
              <div className="user-avatar">
                {(userName || userEmail).charAt(0).toUpperCase()}
              </div>
              <div className="user-info-text">
                <span className="user-email-text">{userName || userEmail}</span>
                <span className="user-role-text">{userProfession || "Operator"}</span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="sidebar-item signout-button"
              title="Terminate Session"
            >
              <div className="item-icon">
                <LogOut size={17} />
              </div>
              <span className="item-label">Terminate Session</span>
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}