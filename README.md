# Claims Portal (React)

React front end for the Chubb APAC Claims Backend (`anuragdac16/insurance-app`).
One app, two portals:

**Claimant** (`/claimant/...`)
- Submit a motor or property claim (`POST /api/v1/claims`). The tracking token is shown once; it is also saved in this browser.
- Track a claim with claim number and token (`GET /api/v1/claims/{claimNumber}`), see status history and the decision.
- Answer information requests (`POST .../information-requests/{requestId}/responses`).

**Staff** (`/staff/...`)
- Queue with status / market / assignee filters and paging (`GET /api/v1/staff/claims`).
- Workload (`GET /api/v1/staff/claims/workload`).
- Claim page: assign, start/resume review, request information, approve or reject, record settlement.

## Run

1. Start the backend (see its README): `docker compose up --build` -> http://localhost:8080
2. In this folder:

```bash
npm install
npm run dev
```

Open http://localhost:5173.

The dev server proxies `/api` to `http://localhost:8080` (change with `VITE_API_TARGET`, see `.env.example`), so no backend CORS setup is needed.

## End-to-end test (mirrors the Postman "Approved claim" folder)

1. Claimant -> **Submit a claim** (use e.g. market SG, currency SGD). Keep the token.
2. Staff -> **Staff queue** -> open the claim -> **Assign** -> **Move to Under review**.
3. **Request information** -> then as claimant (**Track a claim**) send the response.
4. Staff: **Record decision** (Approve, amount in the claim's currency) -> **Record settlement** (same amount).
5. Claimant: track the claim; status is Settled.

## Notes and limits

- The backend has no authentication. The "Acting as" box in the staff header is only sent as the actor name (`assignedBy`, `changedBy`, `decidedBy`, ...).
- There is no staff endpoint for a single claim's history. The staff claim page loads history, information requests and the decision through the claimant tracking endpoint, which needs the claim's token (auto-used when this browser submitted the claim).
- Response shapes for the queue and workload were not documented, so those pages render defensively (Spring `Page` or plain array; workload as a generic table). If your responses differ, adjust field names in `src/pages/staff/`.
- Do not expose the app or backend publicly until authentication and role-based access exist.
