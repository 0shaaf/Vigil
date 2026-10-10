"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ShieldAlert, LogIn, RefreshCw } from "lucide-react";

export default function DashboardErrorBoundary({ error, reset }) {
  useEffect(() => {
    console.error("[Dashboard Error Boundary Caught]:", error);
    // If the error indicates an expired session or missing user ID, automatically navigate to login
    const msg = (error?.message || "").toLowerCase();
    if (
      msg.includes("unauthorized") ||
      msg.includes("cannot read properties of undefined") ||
      msg.includes("reading 'id'") ||
      msg.includes("reading \"id\"") ||
      msg.includes("session") ||
      msg.includes("auth")
    ) {
      window.location.href = "/login";
    }
  }, [error]);

  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "#0f1015",
          border: "1px solid rgba(255, 59, 25, 0.3)",
          borderRadius: "16px",
          padding: "32px",
          maxWidth: "440px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.85)",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "rgba(255, 59, 25, 0.12)",
            border: "1px solid rgba(255, 59, 25, 0.3)",
            color: "#ff3b19",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <ShieldAlert size={24} />
        </div>

        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            color: "#ffffff",
            fontSize: "1.25rem",
            fontWeight: 700,
            margin: "0 0 8px",
          }}
        >
          Session Expired
        </h2>

        <p
          style={{
            fontFamily: "var(--font-sans, 'Inter', sans-serif)",
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "13px",
            lineHeight: "1.5",
            margin: "0 0 24px",
          }}
        >
          Your operator session has expired or the connection was interrupted. Please re-authenticate to continue managing your sentinels.
        </p>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <RefreshCw size={13} />
            <span>Try Again</span>
          </button>

          <Link
            href="/login"
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              background: "#ff3b19",
              color: "#000000",
              fontSize: "12px",
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <LogIn size={13} />
            <span>Log In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
