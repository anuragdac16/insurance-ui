import React from "react";
import { Link } from "react-router-dom";
import { getMyClaims } from "../storage.js";
import { StatusBadge, formatDate } from "../components/ui.jsx";

export default function Home() {
  const mine = getMyClaims();
  return (
    <>
      <div className="page-head">
        <h1>Claims Portal</h1>
        <p className="muted">Submit and track claims, or work the claims queue.</p>
      </div>

      <div className="hero">
        <section className="card">
          <h2>Claimant</h2>
          <p className="muted">File a motor or property claim, follow its progress, and answer requests for more information.</p>
          <div className="actions">
            <Link className="btn" to="/claimant/new">Submit a claim</Link>
            <Link className="btn secondary" to="/claimant/track">Track a claim</Link>
          </div>
        </section>
        <section className="card">
          <h2>Staff</h2>
          <p className="muted">Work the queue: assign, review, request information, decide and settle.</p>
          <div className="actions">
            <Link className="btn" to="/staff/claims">Open queue</Link>
            <Link className="btn secondary" to="/staff/workload">View workload</Link>
          </div>
        </section>
      </div>

      {mine.length > 0 && (
        <section className="card">
          <h2 style={{ marginBottom: ".6rem" }}>Claims saved in this browser</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Claim</th><th>Policy</th><th>Saved</th><th /></tr>
              </thead>
              <tbody>
                {mine.map((c) => (
                  <tr key={c.claimNumber}>
                    <td><strong>{c.claimNumber}</strong></td>
                    <td>{c.summary?.policyNumber || "-"}</td>
                    <td>{formatDate(c.savedAt)}</td>
                    <td><Link to={`/claimant/track/${encodeURIComponent(c.claimNumber)}`}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
