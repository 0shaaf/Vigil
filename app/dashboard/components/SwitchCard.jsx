import Link from "next/link";

function getCountdown(lastCheckIn, interval) {
  if (!lastCheckIn) return "Awaiting Pulse";
  const target = new Date(lastCheckIn);
  if (interval?.months) target.setMonth(target.getMonth() + Number(interval.months));
  if (interval?.days) target.setDate(target.getDate() + Number(interval.days));
  if (interval?.hours) target.setHours(target.getHours() + Number(interval.hours));
  if (interval?.minutes) target.setMinutes(target.getMinutes() + Number(interval.minutes));

  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return "EXPIRED";

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m remaining`;
}

export default function SwitchCard({ switchData, contactsCount = 0, payloads = [] }) {
  const countdown = getCountdown(switchData.last_check_in, switchData.check_in_interval);
  const actions = switchData.actions || {};
  const modules = actions.modules || {
    beacon: actions.email ?? true,
    data_release: false,
    purge: false,
    lockdown: false,
  };

  const criticalityClass = 
    switchData.criticality === "CRITICAL" ? "tier-high" :
    switchData.criticality === "SENTINEL" ? "tier-low" : "tier-med";

  return (
    <article className="switch-card">
      {/* Top: Name, Purpose Badge & Edit Route */}
      <div className="card-head">
        <div>
          <div style={{ display: "flex", gap: "6px", marginBottom: "6px", alignItems: "center" }}>
            <span className={`tier-pill ${criticalityClass}`}>
              {switchData.criticality || "OPERATIONAL"}
            </span>
            <span className="action-badge" style={{ fontSize: "0.62rem" }}>
              {switchData.purpose || "PERSONAL"}
            </span>
          </div>
          <h3 className="card-title">{switchData.name}</h3>
        </div>
        <Link
          href={`/dashboard/switches/${switchData.id}`}
          className="edit-btn"
          title="Configure Switch"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </Link>
      </div>

      {/* Middle: Countdown Timer */}
      <div className="card-timer-row">
        <div className="timer-label-group">
          <span className="timer-prefix">Triggers In</span>
          <span className="timer-val">{countdown}</span>
        </div>
        <div className="clock-glyph">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
      </div>

      {/* Middle-Bottom: Active Action Modules */}
      <div className="card-actions-strip">
        <span className={`action-badge ${modules.beacon ? "is-enabled" : ""}`}>Beacon</span>
        <span className={`action-badge ${modules.data_release ? "is-enabled" : ""}`}>Release</span>
        <span className={`action-badge ${modules.purge ? "is-enabled" : ""}`}>Purge</span>
        <span className={`action-badge ${modules.lockdown ? "is-enabled" : ""}`}>Lockdown</span>
      </div>

      <hr className="card-divider" />

      {/* Bottom: Contacts & Notes */}
      <div className="card-footer-metrics">
        <div className="metric-col">
          <span className="metric-label">Interval</span>
          <span className="metric-value">
            {switchData.check_in_interval?.days ? `${switchData.check_in_interval.days}d ` : ""}
            {switchData.check_in_interval?.hours ? `${switchData.check_in_interval.hours}h ` : ""}
            {switchData.check_in_interval?.minutes ? `${switchData.check_in_interval.minutes}m` : ""}
            {!switchData.check_in_interval?.days && !switchData.check_in_interval?.hours && !switchData.check_in_interval?.minutes ? "None" : ""}
          </span>
        </div>
        <div className="metric-col">
          <span className="metric-label">Recipients</span>
          <span className="metric-value">{contactsCount || switchData.switch_contacts?.length || 0} Linked</span>
        </div>
      </div>
    </article>
  );
}