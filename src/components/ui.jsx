import React from "react";

export const STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "AWAITING_INFORMATION",
  "APPROVED",
  "REJECTED",
  "SETTLED",
];

export const MARKETS = ["SG", "HK", "MY", "TH", "ID", "PH", "VN", "TW", "KR", "JP", "AU", "NZ", "IN", "CN"];
export const CURRENCIES = ["SGD", "HKD", "MYR", "THB", "IDR", "PHP", "VND", "TWD", "KRW", "JPY", "AUD", "NZD", "INR", "CNY", "USD"];

export const pick = (obj, ...keys) => {
  if (!obj) return undefined;
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
};

export const label = (s) =>
  s ? String(s).replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "-";

export function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const hasTime = String(value).includes("T");
  return hasTime
    ? d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function formatMoney(amount, currency) {
  if (amount === undefined || amount === null || amount === "") return "-";
  const n = Number(amount);
  if (Number.isNaN(n)) return String(amount);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
    }).format(n);
  } catch {
    return `${currency || ""} ${n.toFixed(2)}`.trim();
  }
}

export function StatusBadge({ status }) {
  return <span className={`badge badge-${String(status || "").toLowerCase()}`}>{label(status)}</span>;
}

export function Alert({ kind = "error", children, onClose }) {
  if (!children) return null;
  return (
    <div className={`alert alert-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <div>{children}</div>
      {onClose && (
        <button className="link" onClick={onClose} aria-label="Dismiss">
          Dismiss
        </button>
      )}
    </div>
  );
}

export function Field({ label: text, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{text}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Spinner({ text = "Loading..." }) {
  return <p className="muted">{text}</p>;
}

export function Card({ title, actions, children }) {
  return (
    <section className="card">
      {(title || actions) && (
        <header className="card-head">
          <h2>{title}</h2>
          <div>{actions}</div>
        </header>
      )}
      {children}
    </section>
  );
}

export function KeyValues({ items }) {
  return (
    <dl className="kv">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v ?? "-"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Timeline({ history }) {
  if (!history || history.length === 0) return <p className="muted">No history yet.</p>;
  return (
    <ol className="timeline">
      {history.map((h, i) => {
        const to = pick(h, "toStatus", "status", "newStatus");
        const from = pick(h, "fromStatus", "previousStatus", "oldStatus");
        const when = pick(h, "changedAt", "occurredAt", "createdAt", "timestamp");
        const who = pick(h, "changedBy", "actor", "createdBy");
        const reason = pick(h, "reason", "note");
        return (
          <li key={i}>
            <div className="tl-top">
              <StatusBadge status={to} />
              {from && <span className="muted"> from {label(from)}</span>}
            </div>
            <div className="muted small">
              {formatDate(when)}
              {who ? ` · ${who}` : ""}
            </div>
            {reason && <div className="small">{reason}</div>}
          </li>
        );
      })}
    </ol>
  );
}
