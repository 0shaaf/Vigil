"use client";

import { useState, useEffect } from "react";
import LoginForm from "./compontents/LoginForm";
import SignUpForm from "./compontents/SignUpForm";

export default function Home() {
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    // Check if Supabase dropped the auth co  de onto the root URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      // Forward the user directly to the callback route to establish the session
      window.location.replace(`/auth/callback?code=${code}`);
    }
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0f172a",
      }}
    >
      {isSignUp ? (
        <SignUpForm onToggleMode={() => setIsSignUp(false)} />
      ) : (
        <LoginForm onToggleMode={() => setIsSignUp(true)} />
      )}
    </div>
  );
}