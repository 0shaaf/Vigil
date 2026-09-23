import Link from "next/link";
import SwitchCard from "../components/SwitchCard";
import { readTableData } from "@/app/actions/data";
import "../css/switches.css";

export default async function Switches() {
  const { error, data } = await readTableData("switches");

  const switches = data || [];
  return (
    <div className="switches-page">
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
  );
}