import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { searchStaffClaims } from "../../api.js";
import {
  Alert, Card, Field, Spinner, StatusBadge, STATUSES, MARKETS,
  formatDate, formatMoney, label, pick,
} from "../../components/ui.jsx";

// Accepts either a Spring Page ({content, totalPages, ...}) or a plain array.
export function normalizePage(data, size) {
  if (Array.isArray(data)) return { items: data, totalPages: 1, totalElements: data.length, number: 0 };
  const items = data?.content || data?.items || data?.claims || [];
  return {
    items,
    totalPages: data?.totalPages ?? 1,
    totalElements: data?.totalElements ?? items.length,
    number: data?.number ?? data?.page ?? 0,
    size: data?.size ?? size,
  };
}

export default function Queue() {
  const navigate = useNavigate();
  const [filters, setFilters] = React.useState({ status: "", marketCode: "", assignedTo: "" });
  const [applied, setApplied] = React.useState(filters);
  const [page, setPage] = React.useState(0);
  const [size] = React.useState(20);
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await searchStaffClaims({ ...applied, page, size });
      setData(normalizePage(res, size));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [applied, page, size]);

  React.useEffect(() => {
    load();
  }, [load]);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  function apply(e) {
    e.preventDefault();
    setPage(0);
    setApplied({ ...filters, marketCode: filters.marketCode.trim().toUpperCase() });
  }

  function reset() {
    const blank = { status: "", marketCode: "", assignedTo: "" };
    setFilters(blank);
    setApplied(blank);
    setPage(0);
  }

  return (
    <>
      <div className="page-head">
        <h1>Claims queue</h1>
        <p className="muted">Filter by status, market or assignee, then open a claim to work on it.</p>
      </div>

      <Card>
        <form className="filters" onSubmit={apply}>
          <Field label="Status">
            <select value={filters.status} onChange={set("status")}>
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
          </Field>
          <Field label="Market">
            <input list="q-markets" maxLength={3} value={filters.marketCode} onChange={set("marketCode")} placeholder="All" />
            <datalist id="q-markets">{MARKETS.map((m) => <option key={m} value={m} />)}</datalist>
          </Field>
          <Field label="Assigned to">
            <input value={filters.assignedTo} onChange={set("assignedTo")} placeholder="staff id" />
          </Field>
          <button>Apply</button>
          <button type="button" className="secondary" onClick={reset}>Clear</button>
          <button type="button" className="secondary" onClick={load}>Refresh</button>
        </form>

        <Alert onClose={() => setError("")}>{error}</Alert>
        {loading && !data && <Spinner />}

        {data && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Claim</th><th>Status</th><th>Market</th><th>Product</th>
                    <th>Estimated loss</th><th>Assigned to</th><th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.length === 0 && (
                    <tr><td colSpan={7} className="muted">No claims match these filters.</td></tr>
                  )}
                  {data.items.map((c) => {
                    const num = c.claimNumber;
                    return (
                      <tr key={num} style={{ cursor: "pointer" }} onClick={() => navigate(`/staff/claims/${encodeURIComponent(num)}`, { state: { claim: c } })}>
                        <td><Link to={`/staff/claims/${encodeURIComponent(num)}`} state={{ claim: c }} onClick={(e) => e.stopPropagation()}><strong>{num}</strong></Link></td>
                        <td><StatusBadge status={c.status} /></td>
                        <td>{c.marketCode}</td>
                        <td>{label(c.productType)}</td>
                        <td>{formatMoney(pick(c, "estimatedLossAmount", "exposureAmount"), c.currencyCode)}</td>
                        <td>{pick(c, "assignedTo", "assigneeId", "assignedStaffId") || <span className="muted">Unassigned</span>}</td>
                        <td>{formatDate(pick(c, "submittedAt", "createdAt"))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="pager">
              <span className="muted small">
                {data.totalElements} claim{data.totalElements === 1 ? "" : "s"} · page {data.number + 1} of {Math.max(1, data.totalPages)}
              </span>
              <button className="secondary" disabled={page <= 0 || loading} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="secondary" disabled={page + 1 >= data.totalPages || loading} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
