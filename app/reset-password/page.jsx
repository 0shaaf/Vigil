"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import "./reset-password.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 1. Check if Supabase passed an error in the hash fragment
    if (typeof window !== "undefined" && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const desc = hashParams.get("error_description");
      if (desc) {
        setErrorMsg(desc.replace(/\+/g, " "));
        return;
      }
    }

    // 2. Listen for Supabase PASSWORD_RECOVERY event
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY" || session) {
          setReady(true);
          setErrorMsg("");
        }
      }
    );

    // 3. Fallback check if session was established
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (newPassword.length < 8) {
      setErrorMsg("Password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      }
    } catch (err) {
      setErrorMsg("Failed to persist updated password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="reset-wrapper">
      <div className="reset-card">
        <div className="reset-header">
          <div className="reset-badge">
            <span className="reset-pip" />
            <span>Vigil // Security Gateway</span>
          </div>
          <h1 className="reset-title">Set New Password</h1>
          <p className="reset-subtitle">
            Configure a new master secret for your operator credentials.
          </p>
        </div>

        {errorMsg && (
          <div className="reset-error-box">
            <div style={{ fontWeight: 700, marginBottom: "4px" }}>Recovery Error</div>
            {errorMsg}
            <div style={{ marginTop: "10px" }}>
              <Link href="/forgot-password" style={{ color: "#38bdf8", textDecoration: "underline", fontSize: "11px" }}>
                Request a fresh reset link →
              </Link>
            </div>
          </div>
        )}

        {success ? (
          <div className="reset-success-box">
            <div className="success-glyph">✓</div>
            <h2 className="success-title">Credentials Updated</h2>
            <p className="success-desc">
              Your password has been successfully reconfigured. Initializing dashboard session...
            </p>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="reset-form">
            <div className="form-group">
              <label htmlFor="new-pass" className="form-label">
                New Password
              </label>
              <input
                id="new-pass"
                type="password"
                required
                disabled={!ready && !errorMsg}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="form-input"
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm-pass" className="form-label">
                Confirm New Password
              </label>
              <input
                id="confirm-pass"
                type="password"
                required
                disabled={!ready && !errorMsg}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="form-input"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || (!ready && !errorMsg)}
              className="btn-reset-primary"
            >
              {loading ? (
                <>
                  <span className="reset-spinner" />
                  <span>Committing Update...</span>
                </>
              ) : (
                <span>Update Master Password</span>
              )}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}