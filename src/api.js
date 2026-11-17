// API client for every route in the Insurance Claims API (see Postman collection).
// Requests go to /api/... on the same origin; Vite proxies them to the backend.

const BASE = import.meta.env.VITE_API_BASE || "";

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function describeError(status, body) {
  if (body && typeof body === "object") {
    const msg = body.message || body.detail || body.error || body.title;
    const fieldErrors = body.errors || body.fieldErrors || body.violations;
    let extra = "";
    if (Array.isArray(fieldErrors)) {
      extra = fieldErrors
        .map((e) =>
          typeof e === "string"
            ? e
            : [e.field, e.message || e.defaultMessage].filter(Boolean).join(": ")
        )
        .join("; ");
    } else if (fieldErrors && typeof fieldErrors === "object") {
      extra = Object.entries(fieldErrors)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ");
    }
    const combined = [msg, extra].filter(Boolean).join(" - ");
    if (combined) return combined;
  }
  if (typeof body === "string" && body.trim()) return body;
  return `Request failed with status ${status}`;
}

async function request(method, path, { body, headers, query } = {}) {
  let url = `${BASE}${path}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new ApiError(
      "Cannot reach the claims service. Is the backend running on port 8080?",
      0,
      null
    );
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) throw new ApiError(describeError(res.status, data), res.status, data);
  return data;
}

const enc = encodeURIComponent;

// ---------- Claimant ----------
export const submitClaim = (payload) =>
  request("POST", "/api/v1/claims", { body: payload });

export const trackClaim = (claimNumber, token) =>
  request("GET", `/api/v1/claims/${enc(claimNumber)}`, {
    headers: { "X-Claim-Tracking-Token": token },
  });

export const respondToInformationRequest = (claimNumber, requestId, token, responseText) =>
  request(
    "POST",
    `/api/v1/claims/${enc(claimNumber)}/information-requests/${enc(requestId)}/responses`,
    { headers: { "X-Claim-Tracking-Token": token }, body: { responseText } }
  );

// ---------- Staff ----------
export const searchStaffClaims = ({ status, marketCode, assignedTo, page = 0, size = 20 }) =>
  request("GET", "/api/v1/staff/claims", {
    query: { status, marketCode, assignedTo, page, size },
  });

export const getWorkload = () => request("GET", "/api/v1/staff/claims/workload");

export const assignClaim = (claimNumber, staffId, assignedBy) =>
  request("POST", `/api/v1/staff/claims/${enc(claimNumber)}/assignment`, {
    body: { staffId, assignedBy },
  });

export const changeStatus = (claimNumber, status, changedBy, reason) =>
  request("PATCH", `/api/v1/staff/claims/${enc(claimNumber)}/status`, {
    body: { status, changedBy, reason },
  });

export const requestInformation = (claimNumber, { requestText, dueAt, requestedBy }) =>
  request("POST", `/api/v1/staff/claims/${enc(claimNumber)}/information-requests`, {
    body: { requestText, dueAt, requestedBy },
  });

export const recordDecision = (claimNumber, payload) =>
  request("POST", `/api/v1/staff/claims/${enc(claimNumber)}/decision`, { body: payload });

export const recordSettlement = (claimNumber, payload) =>
  request("POST", `/api/v1/staff/claims/${enc(claimNumber)}/settlements`, { body: payload });

// There is no staff "get one claim" endpoint in the API outline. The staff detail
// page therefore reads the claim from the queue (which lists claims) and, when the
// claimant's tracking token is supplied, from the tracking endpoint for full history.
