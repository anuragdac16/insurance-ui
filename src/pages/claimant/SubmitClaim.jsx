import React from "react";
import { Link } from "react-router-dom";
import { submitClaim } from "../../api.js";
import { saveMyClaim } from "../../storage.js";
import { Alert, Card, Field, MARKETS, CURRENCIES } from "../../components/ui.jsx";

const today = () => new Date().toISOString().slice(0, 10);

const empty = {
  claimantName: "",
  claimantEmail: "",
  claimantPhone: "",
  marketCode: "SG",
  productType: "MOTOR",
  policyNumber: "",
  incidentDate: today(),
  incidentLocation: "",
  incidentDescription: "",
  estimatedLossAmount: "",
  currencyCode: "SGD",
};

export default function SubmitClaim() {
  const [form, setForm] = React.useState(empty);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [created, setCreated] = React.useState(null);
  const [copied, setCopied] = React.useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload = {
        ...form,
        marketCode: form.marketCode.trim().toUpperCase(),
        currencyCode: form.currencyCode.trim().toUpperCase(),
        estimatedLossAmount: Number(form.estimatedLossAmount),
      };
      if (!payload.claimantPhone) delete payload.claimantPhone;
      const res = await submitClaim(payload);
      // The token is shown once by the API; keep it so the claimant can come back.
      saveMyClaim({
        claimNumber: res.claimNumber,
        trackingToken: res.trackingToken,
        summary: { policyNumber: payload.policyNumber, productType: payload.productType },
      });
      setCreated(res);
      setForm({ ...empty, incidentDate: today() });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(created.trackingToken);
      setCopied(true);
    } catch {
      /* clipboard blocked; token is visible to copy manually */
    }
  }

  if (created) {
    return (
      <>
        <div className="page-head"><h1>Claim submitted</h1></div>
        <Alert kind="success">
          Your claim <strong>{created.claimNumber}</strong> has been received.
        </Alert>
        <Card title="Your tracking token">
          <p>
            You need this token to track the claim and reply to requests. <strong>It is shown only once</strong> and
            cannot be retrieved later. It has been saved in this browser, but please keep a copy.
          </p>
          <div className="token-box">{created.trackingToken}</div>
          <div className="actions">
            <button className="secondary" onClick={copyToken}>{copied ? "Copied" : "Copy token"}</button>
            <Link className="btn" to={`/claimant/track/${encodeURIComponent(created.claimNumber)}`}>Track this claim</Link>
            <button className="secondary" onClick={() => setCreated(null)}>Submit another</button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <h1>Submit a claim</h1>
        <p className="muted">Motor or property claims. Fields marked * are required.</p>
      </div>
      <Alert onClose={() => setError("")}>{error}</Alert>
      <form onSubmit={onSubmit}>
        <Card title="About you">
          <div className="form-grid">
            <Field label="Full name *"><input required value={form.claimantName} onChange={set("claimantName")} /></Field>
            <Field label="Email *"><input required type="email" value={form.claimantEmail} onChange={set("claimantEmail")} /></Field>
            <Field label="Phone"><input value={form.claimantPhone} onChange={set("claimantPhone")} placeholder="+65 8123 4567" /></Field>
          </div>
        </Card>

        <Card title="Policy">
          <div className="form-grid">
            <Field label="Market *" hint="Country code">
              <input required list="markets" maxLength={3} value={form.marketCode} onChange={set("marketCode")} />
              <datalist id="markets">{MARKETS.map((m) => <option key={m} value={m} />)}</datalist>
            </Field>
            <Field label="Product *">
              <select value={form.productType} onChange={set("productType")}>
                <option value="MOTOR">Motor</option>
                <option value="PROPERTY">Property</option>
              </select>
            </Field>
            <Field label="Policy number *"><input required value={form.policyNumber} onChange={set("policyNumber")} placeholder="SG-MOTOR-2026-0042" /></Field>
          </div>
        </Card>

        <Card title="Incident">
          <div className="form-grid">
            <Field label="Date of incident *"><input required type="date" max={today()} value={form.incidentDate} onChange={set("incidentDate")} /></Field>
            <Field label="Location *"><input required value={form.incidentLocation} onChange={set("incidentLocation")} /></Field>
            <Field label="Estimated loss *">
              <input required type="number" min="0" step="0.01" value={form.estimatedLossAmount} onChange={set("estimatedLossAmount")} />
            </Field>
            <Field label="Currency *" hint="ISO code, e.g. SGD">
              <input required list="currencies" maxLength={3} value={form.currencyCode} onChange={set("currencyCode")} />
              <datalist id="currencies">{CURRENCIES.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <div className="field full">
              <span className="field-label">What happened? *</span>
              <textarea required value={form.incidentDescription} onChange={set("incidentDescription")} />
            </div>
          </div>
          <div className="actions">
            <button disabled={busy}>{busy ? "Submitting..." : "Submit claim"}</button>
          </div>
        </Card>
      </form>
    </>
  );
}
