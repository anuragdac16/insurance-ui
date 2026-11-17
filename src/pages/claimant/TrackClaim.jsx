import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { trackClaim, respondToInformationRequest } from "../../api.js";
import { getTokenFor, saveMyClaim, getMyClaims, removeMyClaim } from "../../storage.js";
import {
  Alert, Card, Field, KeyValues, Spinner, StatusBadge, Timeline,
  formatDate, formatMoney, label, pick,
} from "../../components/ui.jsx";

const isAnswered = (r) =>
  Boolean(
    r.answered || r.responded || r.respondedAt || r.response ||
      (Array.isArray(r.responses) && r.responses.length > 0) ||
      String(r.status || "").toUpperCase() === "ANSWERED" ||
      String(r.status || "").toUpperCase() === "RESPONDED"
  );

function InformationRequest({ req, onSubmit, busy }) {
  const [text, setText] = React.useState("");
  const id = pick(req, "requestId", "id");
  const responses = Array.isArray(req.responses) ? req.responses : req.response ? [req.response] : [];
  const answered = isAnswered(req);

  return (
    <div className="info-req">
      <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap" }}>
        <strong>{answered ? "Answered" : "Action needed"}</strong>
        <span className="muted small">Due {formatDate(pick(req, "dueAt", "dueDate"))}</span>
      </div>
      <p style={{ margin: ".4rem 0" }}>{pick(req, "requestText", "text", "message")}</p>
      {responses.map((r, i) => (
        <p key={i} className="small muted">
          Your reply{r.respondedAt ? ` (${formatDate(r.respondedAt)})` : ""}: {typeof r === "string" ? r : r.responseText}
        </p>
      ))}
      {!answered && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(id, text, () => setText(""));
          }}
        >
          <Field label="Your response">
            <textarea required value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          <div className="actions" style={{ marginTop: ".5rem" }}>
            <button disabled={busy || !text.trim()}>{busy ? "Sending..." : "Send response"}</button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function TrackClaim() {
  const params = useParams();
  const navigate = useNavigate();
  const [claimNumber, setClaimNumber] = React.useState(params.claimNumber || "");
  const [token, setToken] = React.useState(params.claimNumber ? getTokenFor(params.claimNumber) : "");
  const [claim, setClaim] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [saved, setSaved] = React.useState(getMyClaims());

  const load = React.useCallback(async (num, tok) => {
    setError("");
    setLoading(true);
    try {
      const data = await trackClaim(num.trim(), tok.trim());
      setClaim(data);
      saveMyClaim({
        claimNumber: data.claimNumber || num.trim(),
        trackingToken: tok.trim(),
        summary: { policyNumber: data.policyNumber, productType: data.productType },
      });
      setSaved(getMyClaims());
    } catch (err) {
      setClaim(null);
      setError(
        err.status === 401 || err.status === 403
          ? "That tracking token does not match this claim."
          : err.status === 404
          ? "No claim found with that number."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load when arriving from a saved claim link.
  React.useEffect(() => {
    if (params.claimNumber) {
      setClaimNumber(params.claimNumber);
      const t = getTokenFor(params.claimNumber);
      setToken(t);
      if (t) load(params.claimNumber, t);
      else setClaim(null);
    }
  }, [params.claimNumber, load]);

  function onLookup(e) {
    e.preventDefault();
    if (params.claimNumber === claimNumber.trim()) load(claimNumber, token);
    else {
      saveMyClaim({ claimNumber: claimNumber.trim(), trackingToken: token.trim(), summary: {} });
      navigate(`/claimant/track/${encodeURIComponent(claimNumber.trim())}`);
    }
  }

  async function onRespond(requestId, text, reset) {
    setError("");
    setNotice("");
    setSending(true);
    try {
      await respondToInformationRequest(claimNumber.trim(), requestId, token.trim(), text);
      reset();
      setNotice("Thanks, your response was sent.");
      await load(claimNumber, token);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  const history = claim?.history || [];
  const requests = claim?.informationRequests || [];
  const decision = claim?.decision;
  const outstanding = requests.filter((r) => !isAnswered(r)).length;

  return (
    <>
      <div className="page-head">
        <h1>Track a claim</h1>
        <p className="muted">Enter your claim number and the tracking token you received when you submitted.</p>
      </div>

      <Card>
        <form onSubmit={onLookup} className="form-grid">
          <Field label="Claim number"><input required value={claimNumber} onChange={(e) => setClaimNumber(e.target.value)} /></Field>
          <Field label="Tracking token"><input required value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" /></Field>
          <div className="field" style={{ justifyContent: "flex-end" }}>
            <button disabled={loading}>{loading ? "Looking up..." : "Track claim"}</button>
          </div>
        </form>
        {saved.length > 0 && (
          <p className="small muted" style={{ marginTop: ".75rem" }}>
            Saved here:{" "}
            {saved.map((c) => (
              <span key={c.claimNumber} style={{ marginRight: ".75rem" }}>
                <button className="link" onClick={() => navigate(`/claimant/track/${encodeURIComponent(c.claimNumber)}`)}>
                  {c.claimNumber}
                </button>{" "}
                <button
                  className="link muted"
                  title="Forget this claim in this browser"
                  onClick={() => {
                    removeMyClaim(c.claimNumber);
                    setSaved(getMyClaims());
                  }}
                >
                  x
                </button>
              </span>
            ))}
          </p>
        )}
      </Card>

      <Alert onClose={() => setError("")}>{error}</Alert>
      <Alert kind="success" onClose={() => setNotice("")}>{notice}</Alert>
      {loading && !claim && <Spinner />}

      {claim && (
        <>
          <Card title={`Claim ${claim.claimNumber || claimNumber}`} actions={<StatusBadge status={claim.status} />}>
            <KeyValues
              items={[
                ["Policy", claim.policyNumber],
                ["Product", label(claim.productType)],
                ["Market", claim.marketCode],
                ["Incident date", formatDate(claim.incidentDate)],
                ["Location", claim.incidentLocation],
                ["Estimated loss", formatMoney(claim.estimatedLossAmount, claim.currencyCode)],
                ["Submitted", formatDate(pick(claim, "submittedAt", "createdAt"))],
              ]}
            />
            {claim.incidentDescription && <p style={{ marginBottom: 0 }}>{claim.incidentDescription}</p>}
          </Card>

          {String(claim.status).toUpperCase() === "AWAITING_INFORMATION" && outstanding > 0 && (
            <Alert kind="info">We need more information from you to continue. Please reply to the request below.</Alert>
          )}

          {requests.length > 0 && (
            <Card title="Information requests">
              {requests.map((r, i) => (
                <InformationRequest key={pick(r, "requestId", "id") ?? i} req={r} onSubmit={onRespond} busy={sending} />
              ))}
            </Card>
          )}

          {decision && (
            <Card title="Decision">
              <KeyValues
                items={[
                  ["Outcome", <StatusBadge key="o" status={decision.outcome} />],
                  ["Approved amount", decision.outcome === "APPROVED" ? formatMoney(decision.liabilityAmount, decision.currencyCode || claim.currencyCode) : "-"],
                  ["Decided", formatDate(pick(decision, "decidedAt", "createdAt"))],
                ]}
              />
              {decision.rationale && <p style={{ marginBottom: 0 }}>{decision.rationale}</p>}
            </Card>
          )}

          <Card title="Progress">
            <Timeline history={[...history].reverse()} />
          </Card>
        </>
      )}
    </>
  );
}
