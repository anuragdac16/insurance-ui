import React from "react";
import { getWorkload } from "../../api.js";
import { Alert, Card, Spinner, StatusBadge, formatMoney, label } from "../../components/ui.jsx";

// The workload response shape is not documented, so this renders whatever rows
// come back: an array, or an object wrapping one.
function toRows(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const arr = Object.values(data).find((v) => Array.isArray(v));
    if (arr) return arr;
  }
  return [];
}

const isMoneyKey = (k) => /amount|exposure|loss|liability/i.test(k);

function Cell({ k, row }) {
  const v = row[k];
  if (k === "status") return <StatusBadge status={v} />;
  if (isMoneyKey(k) && v !== null && v !== undefined && !Number.isNaN(Number(v)))
    return <>{formatMoney(v, row.currencyCode || row.currency)}</>;
  if (v === null || v === undefined || v === "") return <span className="muted">-</span>;
  return <>{typeof v === "object" ? JSON.stringify(v) : String(v)}</>;
}

export default function Workload() {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getWorkload());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const rows = toRows(data);
  const columns = rows.length ? Array.from(new Set(rows.flatMap((r) => Object.keys(r)))) : [];
  const countKey = columns.find((c) => /^(count|total|claims|claimCount)$/i.test(c));
  const total = countKey ? rows.reduce((s, r) => s + (Number(r[countKey]) || 0), 0) : null;

  return (
    <>
      <div className="page-head">
        <h1>Workload</h1>
        <p className="muted">Open claims by market, product, currency, status and assignee, with exposure.</p>
      </div>

      <Alert onClose={() => setError("")}>{error}</Alert>
      {loading && !data && <Spinner />}

      {total !== null && (
        <div className="grid three" style={{ marginBottom: "1rem" }}>
          <div className="stat"><div className="muted small">Total claims</div><div className="num">{total}</div></div>
          <div className="stat"><div className="muted small">Groups</div><div className="num">{rows.length}</div></div>
        </div>
      )}

      <Card title="Breakdown" actions={<button className="secondary" onClick={load} disabled={loading}>Refresh</button>}>
        {data && rows.length === 0 && <p className="muted">No workload to show yet.</p>}
        {rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>{columns.map((c) => <th key={c}>{label(c.replace(/([A-Z])/g, "_$1"))}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>{columns.map((c) => <td key={c}><Cell k={c} row={r} /></td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
