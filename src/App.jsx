import React from "react";
import { NavLink, Route, Routes, Link, useLocation } from "react-router-dom";
import Home from "./pages/Home.jsx";
import SubmitClaim from "./pages/claimant/SubmitClaim.jsx";
import TrackClaim from "./pages/claimant/TrackClaim.jsx";
import Queue from "./pages/staff/Queue.jsx";
import Workload from "./pages/staff/Workload.jsx";
import ClaimDetail from "./pages/staff/ClaimDetail.jsx";
import { getStaffId, setStaffId } from "./storage.js";

function StaffIdentity() {
  const [id, setId] = React.useState(getStaffId());
  return (
    <label className="small muted" title="No authentication yet: this name is sent as the actor on staff actions">
      Acting as{" "}
      <input
        style={{ width: 170, padding: ".25rem .5rem" }}
        value={id}
        onChange={(e) => {
          setId(e.target.value);
          setStaffId(e.target.value);
        }}
      />
    </label>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const inStaff = pathname.startsWith("/staff");

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">Claims Portal</Link>
          <nav className="nav">
            <NavLink to="/claimant/new">Submit a claim</NavLink>
            <NavLink to="/claimant/track">Track a claim</NavLink>
            <NavLink to="/staff/claims">Staff queue</NavLink>
            <NavLink to="/staff/workload">Workload</NavLink>
          </nav>
          <div className="spacer" />
          {inStaff && <StaffIdentity />}
        </div>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/claimant/new" element={<SubmitClaim />} />
          <Route path="/claimant/track" element={<TrackClaim />} />
          <Route path="/claimant/track/:claimNumber" element={<TrackClaim />} />
          <Route path="/staff" element={<Queue />} />
          <Route path="/staff/claims" element={<Queue />} />
          <Route path="/staff/workload" element={<Workload />} />
          <Route path="/staff/claims/:claimNumber" element={<ClaimDetail />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </>
  );
}
