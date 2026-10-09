import Link from "next/link";
import { redirect } from "next/navigation";
import SwitchCard from "../components/SwitchCard";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import "../css/switches.css";

export const metadata = {
  title: "Switches | Vigil",
  description: "Active fail-safe triggers and release schedules",
};

export default async function Switches() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { error, data } = await supabase
    .from("switches")
    .select("*")
    .eq("usr_id", user.id)
    .order("created_at", { ascending: false });

  const switches = data || [];
  return (
    <div className="switches-page">
      {/* Overhead Lighting & Horizon Grid Layers */}
      <div className="switches-top-glow-line" />
      <div className="switches-overhead-glow" />
      <div className="switches-ambient-ray" />
      <div className="switches-grid-backdrop" />

      {/* Main Content Area */}
      <div className="switches-content-shell">
        <header className="switches-topbar">
          <div>
            <h1 className="switches-heading">Switches</h1>
            <p className="switches-subheading">
              Active fail-safe triggers and release schedules
            </p>
          </div>
          <Link href="/dashboard/switches/create" className="btn-new-switch">
            + New Switch
          </Link>
        </header>

        {error && (
          <div className="switches-error">
            Failed to load switches: {error.message || "Database error"}
          </div>
        )}

        {switches.length === 0 && !error ? (
          <div className="switches-empty-state">
            <p>No switches armed.</p>
            <Link href="/dashboard/switches/create" className="empty-state-link">
              Arm your first switch →
            </Link>
          </div>
        ) : (
          <section className="switches-grid">
            {switches.map((item) => (
              <SwitchCard key={item.id} switchData={item} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}