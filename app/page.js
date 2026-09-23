"use client";

import { useState } from "react";
import LoginForm from "./compontents/LoginForm";
import SignUpForm from "./compontents/SignUpForm";


export default function Home() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0f172a"
    }}>
      {isSignUp ? (
        <SignUpForm onToggleMode={()=> setIsSignUp(false)}/>
      ) : (
        <LoginForm onToggleMode={() => setIsSignUp(true)} />
      )}
    </div>
  );
}