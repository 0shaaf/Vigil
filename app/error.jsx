"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ShieldAlert, RefreshCw, LogIn } from "lucide-react";

export default function GlobalErrorBoundary({ error, reset }) {
  useEffect(() => {
    console.error("[Global Error Boundary Caught]:", error);
    const msg = (error?.message || "").toLowerCase();
    if (
      msg.includes("unauthorized") ||
      msg.includes("cannot read properties of undefined") ||
      msg.includes("reading 'id'") ||
      msg.includes("reading \"id\"") ||
      msg.includes("session")
    ) {
      window.location.href = "/login";
    }
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000000",
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
          padding: "36px",
          maxWidth: "460px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.9)",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "14px",
            background: "rgba(255, 59, 25, 0.12)",
            border: "1px solid rgba(255, 59, 25, 0.3)",
            color: "#ff3b19",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px",
          }}
        >
          <ShieldAlert size={26} />
        </div>

        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            color: "#ffffff",
            fontSize: "1.35rem",
            fontWeight: 700,
            margin: "0 0 10px",
          }}
        >
          System Perimeter Alert
        </h2>

        <p
          style={{
            fontFamily: "var(--font-sans, 'Inter', sans-serif)",
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "13.5px",
            lineHeight: "1.5",
            margin: "0 0 28px",
          }}
        >
          An unexpected interruption occurred. If your session has expired, re-authenticating will restore full access.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "11px 18px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>

          <Link
            href="/login"
            style={{
              padding: "11px 22px",
              borderRadius: "8px",
              background: "#ff3b19",
              color: "#000000",
              fontSize: "12.5px",
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <LogIn size={14} />
            <span>Log In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
