import Link from "next/link";

function getCountdown(lastCheckIn, interval) {
  if (!lastCheckIn) return "Awaiting Pulse";
  const target = new Date(lastCheckIn);
  if (interval?.months) target.setMonth(target.getMonth() + Number(interval.months));
  if (interval?.days) target.setDate(target.getDate() + Number(interval.days));
  if (interval?.hours) target.setHours(target.getHours() + Number(interval.hours));

  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return "EXPIRED";

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  return days > 0 ? `${days}d ${hours}h` : `${totalHours}h`;
}

export default function SwitchCard({ switchData, contactsCount = 0, payloads = [] }) {
  const countdown = getCountdown(switchData.last_check_in, switchData.check_in_interval);
  const actions = switchData.actions || { call: false, email: false, forwardData: false };

  // Calculate payload tiers
  const tierCounts = payloads.reduce(
    (acc, p) => {
      if (p.trust_required === -1) acc.targeted += 1;
      else if (p.trust_required >= 75) acc.high += 1;
      else if (p.trust_required >= 50) acc.med += 1;
      else acc.low += 1;
      return acc;
    },
    { high: 0, med: 0, low: 0, targeted: 0 }
  );

  return (
    <article className="switch-card">
      {/* Top: Name & Edit Route */}
      <div className="card-head">
        <h3 className="card-title">{switchData.name}</h3>
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

      {/* Middle-Bottom: Escalation Actions Matrix */}
      <div className="card-actions-strip">
        <span className={`action-badge ${actions.email ? "is-enabled" : ""}`}>Email</span>
        <span className={`action-badge ${actions.call ? "is-enabled" : ""}`}>Call</span>
        <span className={`action-badge ${actions.forwardData ? "is-enabled" : ""}`}>Forward</span>
      </div>

      <hr className="card-divider" />

      {/* Bottom: Payloads & Contacts Breakdown */}
      <div className="card-footer-metrics">
        <div className="metric-col">
          <span className="metric-label">Contacts</span>
          <span className="metric-value">{contactsCount} Linked</span>
        </div>
        <div className="metric-col">
          <span className="metric-label">Payload Tiers</span>
          <div className="tier-pills">
            {tierCounts.high > 0 && <span className="tier-pill tier-high">{tierCounts.high}H</span>}
            {tierCounts.med > 0 && <span className="tier-pill tier-med">{tierCounts.med}M</span>}
            {tierCounts.low > 0 && <span className="tier-pill tier-low">{tierCounts.low}L</span>}
            {tierCounts.targeted > 0 && <span className="tier-pill tier-targeted">{tierCounts.targeted}T</span>}
            {payloads.length === 0 && <span className="tier-none">None</span>}
          </div>
        </div>
      </div>
    </article>
  );
}