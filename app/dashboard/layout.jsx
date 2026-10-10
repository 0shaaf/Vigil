import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../lib/supabase/server-client";
import Sidebar from "./components/Sidebar";
import "./css/Sidebar.css";
import "./css/dashboard.css";
import "./css/switch-form.css";
import "./css/switches.css";
import "./css/switch-card.css";
import "./css/drive-picker-modal.css";

export default async function DashboardLayout({ children }) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect("/login");
  }

  const user = data.user;
  const isOnboarded = Boolean(user.user_metadata?.onboarding_completed);
  if (!isOnboarded) {
    redirect("/welcome");
  }

  return (
    <div className="dashboard-root-layout">
      {/* Global Dashboard Repeating Linear Gradient Pattern */}
      <div className="dashboard-pattern-bg" aria-hidden="true" />

      <Sidebar
        userEmail={user.email}
        userName={user.user_metadata?.full_name}
        userProfession={user.user_metadata?.profession}
      />
      
      <main className="dashboard-main-viewport">
        {children}
      </main>
    </div>
  );
}