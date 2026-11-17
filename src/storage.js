// Local persistence. The tracking token is shown once by the API and cannot be
// retrieved later, so the claimant's browser keeps it for them.

const CLAIMS_KEY = "claims-ui.myClaims";
const STAFF_KEY = "claims-ui.staffId";

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable; ignore */
  }
}

export const getMyClaims = () => read(CLAIMS_KEY, []);

export function saveMyClaim({ claimNumber, trackingToken, summary }) {
  const list = getMyClaims().filter((c) => c.claimNumber !== claimNumber);
  list.unshift({ claimNumber, trackingToken, summary, savedAt: new Date().toISOString() });
  write(CLAIMS_KEY, list);
}

export function removeMyClaim(claimNumber) {
  write(
    CLAIMS_KEY,
    getMyClaims().filter((c) => c.claimNumber !== claimNumber)
  );
}

export const getTokenFor = (claimNumber) =>
  getMyClaims().find((c) => c.claimNumber === claimNumber)?.trackingToken || "";

export const getStaffId = () => read(STAFF_KEY, "adjuster.sg.001");
export const setStaffId = (id) => write(STAFF_KEY, id);
