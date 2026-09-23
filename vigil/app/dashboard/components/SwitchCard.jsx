import Link from "next/link";
import "../css/switches.css"

// Computes remaining time based on last_check_in and interval object
function getTriggerCountdown(lastCheckIn, interval) {
  if (!lastCheckIn) return "Awaiting Pulse";

  const lastDate = new Date(lastCheckIn);
  const triggerDate = new Date(lastDate);

  // Apply interval deltas
  if (interval?.months) triggerDate.setMonth(triggerDate.getMonth() + Number(interval.months));
  if (interval?.days) triggerDate.setDate(triggerDate.getDate() + Number(interval.days));
  if (interval?.hours) triggerDate.setHours(triggerDate.getHours() + Number(interval.hours));

  const diffMs = triggerDate.getTime() - Date.now();

  if (diffMs <= 0) return "EXPIRED / TRIGGERED";

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;

  if (days > 0) return `${days}d ${remainingHours}h`;
  return `${totalHours}h`;
}

export default function SwitchCard({ switchData }) {
  const countdownText = getTriggerCountdown(
    switchData.last_check_in,
    switchData.check_in_interval
  );

  return (
    <article className="switch-card">
      <div>
        {/* 1. Header: Switch Title & Edit Action */}
        <div className="card-header">
          <h3 className="card-title">{switchData.name}</h3>
          <Link
            href={`/dashboard/switches/${switchData.id}`}
            className="edit-action-link"
            title="Edit Switch"
          >
            {/* Pencil Icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </Link>
        </div>

        {/* 2. Middle Row: Triggers In + Clock Icon */}
        <div className="card-trigger-row" style={{ marginTop: "14px" }}>
          <div className="trigger-label-group">
            <span className="trigger-prefix">Triggers In</span>
            <span className="trigger-value">{countdownText}</span>
          </div>

          {/* Clock Icon */}
          <svg
            className="trigger-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
      </div>

      {/* 3. Bottom Row: Divider & Description */}
      <div>
        <hr className="card-divider" />
        <div className="card-description-group" style={{ marginTop: "12px" }}>
          <span className="description-heading">Description</span>
          <p className="description-text">
            {switchData.description || "No description provided for this fail-safe switch."}
          </p>
        </div>
      </div>
    </article>
  );
}