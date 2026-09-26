"use client";

import React, { useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import "./forgot-password.css";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        setErrorMsg("");

        try {
            const origin = window.location.origin;
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${origin}/reset-password`,
            });

            if (error) {
                setErrorMsg(error.message);
            } else {
                setSuccess(true);
            }
        } catch (err) {
            setErrorMsg("Network error dispatching reset instructions.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="auth-wrapper">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-status-badge">
                        <span className="status-pip" />
                        <span>Vigil // Security Recovery</span>
                    </div>
                    <h1 className="auth-title">Password Recovery</h1>
                    <p className="auth-subtitle">
                        Enter your authorized email to receive a secure recovery transmission.
                    </p>
                </div>

                {errorMsg && <div className="auth-error-box">{errorMsg}</div>}

                {success ? (
                    <div className="auth-success-box">
                        <div className="success-icon">✓</div>
                        <h2 className="success-title">Recovery Link Dispatched</h2>
                        <p className="success-desc">
                            If an account is associated with <strong>{email}</strong>, a single-use authorization link has been transmitted. Follow the email link to configure a new master secret.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="email" className="form-label">
                                Operator Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="operator@sentinel.net"
                                className="form-input"
                                autoComplete="email"
                            />
                        </div>

                        <button type="submit" disabled={loading} className="btn-auth-primary">
                            {loading ? (
                                <>
                                    <span className="auth-spinner" />
                                    <span>Transmitting Token...</span>
                                </>
                            ) : (
                                <span>Send Recovery Instructions</span>
                            )}
                        </button>
                    </form>
                )}

                <div className="auth-footer">
                    <Link href="/login" className="auth-back-link">
                        ← Return to Operator Authentication
                    </Link>
                </div>
            </div>
        </main>
    );
}