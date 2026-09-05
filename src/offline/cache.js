import { createDefaultState } from "../store/defaults";

const PREFIX = "ugurpos_state_v1_";

function key(branchId) {
  return `${PREFIX}${branchId || "default"}`;
}

export function saveStateCache(branchId, state) {
  if (!state || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      key(branchId),
      JSON.stringify({
        savedAt: new Date().toISOString(),
        state,
      })
    );
  } catch {
    /* quota */
  }
}

export function loadStateCache(branchId) {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(branchId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.state) return null;
    return { ...createDefaultState(), ...parsed.state };
  } catch {
    return null;
  }
}

export function clearStateCache(branchId) {
  try {
    localStorage.removeItem(key(branchId));
  } catch {
    /* ignore */
  }
}
