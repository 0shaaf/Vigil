"use client";

import React, { useState } from "react";
import { signUpWithEmail, signInWithGoogle } from "@/app/lib/supabase/auth/client-auth";
import Link from "next/link";
import { Mail } from "lucide-react";
import "./CSS/AuthForm.css";

export default function SignUpForm({ onToggleMode }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      const { data, error } = await signUpWithEmail(email, password, {
        full_name: name || undefined,
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
      } else {
        setLoading(false);
        setSubmittedEmail(email);
        setIsSuccess(true);
      }
    } catch (err) {
      setErrorMessage("Registration service unavailable. Check network connectivity.");
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setErrorMessage("");
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMessage(error.message);
      }
    } catch (err) {
      setErrorMessage("OAuth provider error.");
    }
  };

  // Crisp Dedicated Confirmation Screen
  if (isSuccess) {
    return (
      <div className="form-container auth-confirmation-view">
        <div className="auth-confirm-icon-wrap">
          <Mail size={24} />
        </div>

        <p className="title" style={{ margin: "0 0 10px 0", fontSize: "20px" }}>
          Check your email
        </p>

        <p className="auth-confirm-text">
          A confirmation link was dispatched to:
        </p>

        <div className="auth-confirm-email-pill">
          {submittedEmail}
        </div>

        <p className="auth-confirm-subtext">
          Click the link inside to activate your account and proceed.
        </p>

        <div className="auth-confirm-actions">
          <Link href="/login" className="form-btn">
            Proceed to Log in
          </Link>
          <button
            type="button"
            className="auth-confirm-secondary-btn"
            onClick={() => {
              setIsSuccess(false);
              setEmail("");
              setPassword("");
            }}
          >
            Register with a different address
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <p className="title">Create an account</p>

      {errorMessage && <div className="auth-error">{errorMessage}</div>}

      <form className="form" onSubmit={handleSignUp}>
        <input
          type="text"
          className="input"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          className="input"
          placeholder="Email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="input"
          placeholder="Password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="form-btn" type="submit" disabled={loading}>
          {loading ? "Signing up..." : "Sign up"}
        </button>
      </form>

      <p className="sign-up-label">
        Already have an account?
        {onToggleMode ? (
          <span className="sign-up-link" onClick={onToggleMode}>
            Log in
          </span>
        ) : (
          <Link href="/login" className="sign-up-link">
            Log in
          </Link>
        )}
      </p>

      <div className="buttons-container">
        <button
          type="button"
          className="google-login-button"
          onClick={handleGoogleSignUp}
        >
          <svg
            stroke="currentColor"
            fill="currentColor"
            strokeWidth={0}
            version="1.1"
            x="0px"
            y="0px"
            className="google-icon"
            viewBox="0 0 48 48"
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#FFC107"
              d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
            />
            <path
              fill="#FF3D00"
              d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
            />
            <path
              fill="#4CAF50"
              d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
            />
            <path
              fill="#1976D2"
              d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
            />
          </svg>
          <span>Sign up with Google</span>
        </button>
      </div>
    </div>
  );
}