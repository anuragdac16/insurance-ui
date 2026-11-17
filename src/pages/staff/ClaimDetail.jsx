import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  assignClaim, changeStatus, requestInformation, recordDecision,
  recordSettlement, searchStaffClaims, trackClaim,
} from "../../api.js";
import { getStaffId, getTokenFor } from "../../storage.js";
import {
  Alert, Card, Field, KeyValues, Spinner, StatusBadge, Timeline,
  formatDate, formatMoney, label, pick,
} from "../../components/ui.jsx";
import { normalizePage } from "./Queue.jsx";

// There is no "get one claim" endpoint for staff, so the claim is taken from the
// queue row that was clicked, or found by paging through the queue.
async function findInQueue(claimNumber) {
  for (let page = 0; page < 10; page++) {
    const res = normalizePage(await searchStaffClaims({ page, size: 100 }), 100);
    const hit = res.items.find((c) => c.claimNumber === claimNumber);
    if (hit) return hit;
    if (page + 1 >= res.totalPages) break;
  }
  return null;
}

const toIso = (localValue) => (localValue ? new Date(localValue).toISOString() : undefined);

function useAction(setError, setNotice, merge) {
  const [busy, setBusy] = React.useState(false);
  const run = async (fn, successMessage, after) => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res = await fn();
      if (res && typeof res === "object") merge(res);
      setNotice(successMessage);
      if (after) after(res);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return [busy, run];
}

export default function ClaimDetail() {
  const { claimNumber: rawNumber } = useParams();
  const claimNumber = decodeURIComponent(rawNumber);
  const location = useLocation();
  const staffId = getStaffId();

  const [claim, setClaim] = React.useState(location.state?.claim || null);
  const [detail, setDetail] = React.useState(null); // tracking view: history, requests, decision
  const [token, setToken] = React.useState(getTokenFor(claimNumber));
  const [loading, setLoading] = React.useState(!location.state?.claim);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  const merge = (res) =>
    setClaim((c) => ({ ...(c || {}), ...(res.claimNumber || res.status ? res : {}) }));
  const [busy, run] = useAction(setError, setNotice, merge);

  // Forms
  const [assignTo, setAssignTo] = React.useState("");
  const [reviewReason, setReviewReason] = React.useState("");
  const [info, setInfo] = React.useState({ requestText: "", dueAt: "" });
  const [decision, setDecision] = React.useState({ outcome: "APPROVED", rationale: "", liabilityAmount: "" });
  const [settle, setSettle] = React.useState({ paymentReference: "", amount: "" });

  React.useEffect(() => {
    if (claim) return;
    let alive = true;
    (async () => {
      try {
        const hit = await findInQueue(claimNumber);
        if (!alive) return;
        if (hit) setClaim(hit);
        else setError("Claim not found in the queue.");
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [claim, claimNumber]);

  const loadDetail = React.useCallback(
    async (tok) => {
      if (!tok) return;
      try {
        const d = await trackClaim(claimNumber, tok.trim());
        setDetail(d);
        setClaim((c) => ({ ...(c || {}), ...d }));
        setError("");
      } catch (err) {
        setDetail(null);
        setError(
          err.status === 401 || err.status === 403 || err.status === 404
            ? "Could not load history: the tracking token does not match this claim."
            : err.message
        );
      }
    },
    [claimNumber]
  );

  // If this browser already holds the token (e.g. same person testing both sides), use it.
  React.useEffect(() => {
    if (token && !detail) loadDetail(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshDetail = () => (token ? loadDetail(token) : undefined);

  if (loading) return <Spinner />;
  if (!claim) return <Alert>{error || "Claim not found."}</Alert>;

  const status = String(claim.status || "").toUpperCase();
  const currency = claim.currencyCode;
  const assignee = pick(claim, "assignedTo", "assigneeId", "assignedStaffId");
  const terminal = status === "REJECTED" || status === "SETTLED";
  const decisionData = detail?.decision;
  const history = detail?.history || [];
  const requests = detail?.informationRequests || [];

  const approvedAmount =
    decisionData?.liabilityAmount ?? (status === "APPROVED" ? decision.liabilityAmount : "");

  return (
    <>
      <p><Link to="/staff/claims">&larr; Back to queue</Link></p>
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1>Claim {claim.claimNumber}</h1>
          <p className="muted" style={{ margin: 0 }}>Signed in as {staffId}</p>
        </div>
        <div><StatusBadge status={claim.status} /></div>
      </div>

      <Alert onClose={() => setError("")}>{error}</Alert>
      <Alert kind="success" onClose={() => setNotice("")}>{notice}</Alert>

      <Card title="Summary">
        <KeyValues
          items={[
            ["Market", claim.marketCode],
            ["Product", label(claim.productType)],
            ["Policy", claim.policyNumber],
            ["Claimant", pick(claim, "claimantName", "claimant")],
            ["Estimated loss", formatMoney(claim.estimatedLossAmount, currency)],
            ["Assigned to", assignee || "Unassigned"],
            ["Incident date", formatDate(claim.incidentDate)],
            ["Location", claim.incidentLocation],
            ["Submitted", formatDate(pick(claim, "submittedAt", "createdAt"))],
          ]}
        />
        {claim.incidentDescription && <p style={{ marginBottom: 0 }}>{claim.incidentDescription}</p>}
      </Card>

      {!terminal && (
        <Card title="Assign">
          <form
            className="filters"
            style={{ marginBottom: 0 }}
            onSubmit={(e) => {
              e.preventDefault();
              run(() => assignClaim(claimNumber, assignTo.trim(), staffId), `Assigned to ${assignTo.trim()}.`, () => {
                setClaim((c) => ({ ...c, assignedTo: assignTo.trim() }));
                setAssignTo("");
                refreshDetail();
              });
            }}
          >
            <Field label="Staff ID"><input required value={assignTo} onChange={(e) => setAssignTo(e.target.value)} placeholder="adjuster.sg.001" /></Field>
            <button disabled={busy}>{assignee ? "Reassign" : "Assign"}</button>
          </form>
        </Card>
      )}

      {(status === "SUBMITTED" || status === "AWAITING_INFORMATION") && (
        <Card title={status === "SUBMITTED" ? "Start review" : "Resume review"}>
          <p className="muted small" style={{ marginTop: 0 }}>
            {status === "AWAITING_INFORMATION"
              ? "The claim returns to review automatically when the claimant answers every request. You can also resume it manually."
              : "Moves the claim to Under review."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => changeStatus(claimNumber, "UNDER_REVIEW", staffId, reviewReason || "Review started"), "Claim moved to Under review.", () => {
                setReviewReason("");
                refreshDetail();
              });
            }}
          >
            <Field label="Reason"><input value={reviewReason} onChange={(e) => setReviewReason(e.target.value)} placeholder="Initial coverage and incident review started" /></Field>
            <div className="actions"><button disabled={busy}>Move to Under review</button></div>
          </form>
        </Card>
      )}

      {status === "UNDER_REVIEW" && (
        <>
          <Card title="Request information">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(
                  () => requestInformation(claimNumber, { requestText: info.requestText, dueAt: toIso(info.dueAt), requestedBy: staffId }),
                  "Information requested. The claim is now Awaiting information.",
                  () => {
                    setInfo({ requestText: "", dueAt: "" });
                    refreshDetail();
                  }
                );
              }}
            >
              <div className="form-grid">
                <div className="field full">
                  <span className="field-label">What do you need from the claimant? *</span>
                  <textarea required value={info.requestText} onChange={(e) => setInfo({ ...info, requestText: e.target.value })} />
                </div>
                <Field label="Due by"><input type="datetime-local" value={info.dueAt} onChange={(e) => setInfo({ ...info, dueAt: e.target.value })} /></Field>
              </div>
              <div className="actions"><button disabled={busy}>Send request</button></div>
            </form>
          </Card>

          <Card title="Record decision">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const approved = decision.outcome === "APPROVED";
                run(
                  () =>
                    recordDecision(claimNumber, {
                      outcome: decision.outcome,
                      rationale: decision.rationale,
                      liabilityAmount: approved ? Number(decision.liabilityAmount) : 0,
                      currencyCode: currency,
                      decidedBy: staffId,
                    }),
                  approved ? "Claim approved." : "Claim rejected.",
                  () => {
                    if (approved) setSettle((s) => ({ ...s, amount: decision.liabilityAmount }));
                    refreshDetail();
                  }
                );
              }}
            >
              <div className="form-grid">
                <Field label="Outcome">
                  <select value={decision.outcome} onChange={(e) => setDecision({ ...decision, outcome: e.target.value })}>
                    <option value="APPROVED">Approve</option>
                    <option value="REJECTED">Reject</option>
                  </select>
                </Field>
                {decision.outcome === "APPROVED" && (
                  <Field label={`Liability amount (${currency || "claim currency"}) *`} hint="Must use the claim's currency">
                    <input required type="number" min="0" step="0.01" value={decision.liabilityAmount} onChange={(e) => setDecision({ ...decision, liabilityAmount: e.target.value })} />
                  </Field>
                )}
                <div className="field full">
                  <span className="field-label">Rationale *</span>
                  <textarea required value={decision.rationale} onChange={(e) => setDecision({ ...decision, rationale: e.target.value })} />
                </div>
              </div>
              <div className="actions">
                <button className={decision.outcome === "APPROVED" ? "ok" : "danger"} disabled={busy}>
                  {decision.outcome === "APPROVED" ? "Approve claim" : "Reject claim"}
                </button>
              </div>
            </form>
          </Card>
        </>
      )}

      {status === "APPROVED" && (
        <Card title="Record settlement">
          <p className="muted small" style={{ marginTop: 0 }}>
            Amount and currency must match the approved decision. A claim can be settled once.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () =>
                  recordSettlement(claimNumber, {
                    paymentReference: settle.paymentReference,
                    amount: Number(settle.amount),
                    currencyCode: currency,
                    recordedBy: staffId,
                  }),
                "Settlement recorded. Claim is Settled.",
                refreshDetail
              );
            }}
          >
            <div className="form-grid">
              <Field label="Payment reference *"><input required value={settle.paymentReference} onChange={(e) => setSettle({ ...settle, paymentReference: e.target.value })} placeholder="PAY-SG-0001" /></Field>
              <Field label={`Amount (${currency || "claim currency"}) *`} hint={approvedAmount ? `Approved: ${formatMoney(approvedAmount, currency)}` : undefined}>
                <input required type="number" min="0" step="0.01" value={settle.amount || approvedAmount || ""} onChange={(e) => setSettle({ ...settle, amount: e.target.value })} />
              </Field>
            </div>
            <div className="actions"><button className="ok" disabled={busy}>Record settlement</button></div>
          </form>
        </Card>
      )}

      {terminal && <Alert kind="info">This claim is {label(status).toLowerCase()}; no further actions are available.</Alert>}

      <Card title="History, requests and decision">
        {!detail ? (
          <>
            <p className="muted small" style={{ marginTop: 0 }}>
              The staff API has no endpoint for a claim's timeline, so it is loaded through the claimant tracking
              endpoint. Enter the claimant's tracking token to view history, information requests and the decision.
            </p>
            <form
              className="filters"
              style={{ marginBottom: 0 }}
              onSubmit={(e) => {
                e.preventDefault();
                loadDetail(token);
              }}
            >
              <Field label="Tracking token"><input value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" /></Field>
              <button disabled={!token.trim()}>Load</button>
            </form>
          </>
        ) : (
          <>
            {decisionData && (
              <p>
                <strong>Decision:</strong> <StatusBadge status={decisionData.outcome} />{" "}
                {decisionData.outcome === "APPROVED" && formatMoney(decisionData.liabilityAmount, decisionData.currencyCode || currency)}
                {decisionData.rationale ? ` - ${decisionData.rationale}` : ""}
              </p>
            )}
            {requests.length > 0 && (
              <>
                <h2 style={{ margin: ".5rem 0" }}>Information requests</h2>
                {requests.map((r, i) => {
                  const responses = Array.isArray(r.responses) ? r.responses : r.response ? [r.response] : [];
                  return (
                    <div className="info-req" key={pick(r, "requestId", "id") ?? i}>
                      <div>{pick(r, "requestText", "text")}</div>
                      <div className="muted small">Due {formatDate(pick(r, "dueAt", "dueDate"))}</div>
                      {responses.length === 0 ? (
                        <div className="small" style={{ color: "var(--warn)" }}>Waiting for claimant</div>
                      ) : (
                        responses.map((x, j) => (
                          <div key={j} className="small"><strong>Reply:</strong> {typeof x === "string" ? x : x.responseText}</div>
                        ))
                      )}
                    </div>
                  );
                })}
              </>
            )}
            <h2 style={{ margin: ".75rem 0 .5rem" }}>Status history</h2>
            <Timeline history={[...history].reverse()} />
            <div className="actions"><button className="secondary" onClick={refreshDetail}>Refresh</button></div>
          </>
        )}
      </Card>
    </>
  );
}
