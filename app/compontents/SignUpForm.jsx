"use client";

import React, { useState } from "react";
import { signUpWithEmail, signInWithGoogle } from "@/app/lib/supabase/auth/client-auth";
import "./CSS/AuthForm.css";
import { redirect } from "next/dist/server/api-utils";

export default function SignUpForm({ onToggleMode }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    const { data, error } = await signUpWithEmail(email, password);

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
    } else {
      setLoading(false);
      setSuccessMessage("Account created! Check your email inbox to confirm.");
    }
  };

  const handleGoogleSignUp = async () => {
    setErrorMessage("");
    const { error } = await signInWithGoogle();
    if (error) {
      setErrorMessage(error.message);
    }
  };

  return (
    <div className="form-container">
      <p className="form-title">Create account</p>

      {errorMessage && <div className="auth-error">{errorMessage}</div>}
      {successMessage && (
        <div className="auth-error" style={{ backgroundColor: "#ecfdf5", color: "#047857" }}>
          {successMessage}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSignUp}>
        <input
          type="text"
          className="auth-input"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          className="auth-input"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="auth-input"
          placeholder="Password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="form-btn" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="sign-up-label">
        Already have an account?
        <span className="sign-up-link" onClick={onToggleMode}>
          Log in
        </span>
      </p>

      <div className="auth-divider">
        <span>or</span>
      </div>

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