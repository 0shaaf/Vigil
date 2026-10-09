import React from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../lib/supabase/server-client";
import WelcomeQuestionnaire from "./WelcomeQuestionnaire";
import "./welcome.css";

export const metadata = {
  title: "Welcome to Vigil",
  description: "Tell us a bit about yourself to set up your profile",
};

export default async function WelcomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // 1. Must be authenticated
  if (authError || !user) {
    redirect("/login");
  }

  // 2. If already onboarded, send straight to dashboard
  if (user.user_metadata?.onboarding_completed) {
    redirect("/dashboard");
  }

  return (
    <main className="welcome-viewport">
      <div className="welcome-ambient-glow" aria-hidden="true" />
      <div className="welcome-grid-bg" aria-hidden="true" />

      <WelcomeQuestionnaire
        userEmail={user.email}
        initialMetadata={user.user_metadata || {}}
      />
    </main>
  );
}
