import bcrypt from "bcryptjs";
import { enqueueItem } from "./queue.js";

const ROSTER_KEY = "ugurpos_staff_roster_v1";
const SYNC_TOKEN_KEY = "ugurpos_branch_sync_token";

export function isDesktopApp() {
  return typeof window !== "undefined" && window.ugurpos?.isDesktop === true;
}

export function getBranchSyncToken() {
  try {
    return localStorage.getItem(SYNC_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function saveStaffRoster(pack) {
  if (!pack?.branch?.id || !Array.isArray(pack.staff)) return;
  try {
    localStorage.setItem(
      ROSTER_KEY,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        branch: pack.branch,
        staff: pack.staff,
      })
    );
    if (pack.syncToken) localStorage.setItem(SYNC_TOKEN_KEY, pack.syncToken);
  } catch {
    /* quota */
  }
}

function loadRoster() {
  try {
    const raw = localStorage.getItem(ROSTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.branch?.id || !Array.isArray(parsed.staff)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function accountFromStaff(roster, staff) {
  const branch = roster.branch;
  const staffName = `${staff.name || ""} ${staff.surname || ""}`.trim() || staff.name;
  return {
    email: staff.login || "",
    firmId: branch.firmId,
    firmName: branch.firmName,
    branchId: branch.id,
    branchName: branch.name,
    branchNo: branch.branchNo || "",
    branchEmail: branch.email || "",
    staffId: staff.id,
    staffName,
    staffRole: staff.role || "Kasiyer",
    canCashExpense: !!staff.canCashExpense,
    role: "staff",
    loginType: "staff",
    currency: branch.currency,
    branchKind: branch.kind === "production" ? "production" : "sales",
    branches: [
      {
        id: branch.id,
        firmId: branch.firmId,
        name: branch.name,
        branchNo: branch.branchNo || "",
        email: branch.email || "",
        kind: branch.kind === "production" ? "production" : "sales",
      },
    ],
    offlineSession: true,
  };
}

export function verifyOfflineStaff(login, password) {
  const roster = loadRoster();
  if (!roster?.staff?.length) {
    throw new Error("İnternet lazımdır. Kassir siyahısı bu kompüterdə hələ yoxdur.");
  }
  const key = String(login || "").trim().toLowerCase();
  const staff = roster.staff.find((row) => String(row.login || "").trim().toLowerCase() === key);
  if (!staff?.passwordHash) return null;
  let ok = false;
  try {
    ok = bcrypt.compareSync(String(password || ""), staff.passwordHash);
  } catch {
    ok = false;
  }
  if (!ok) return null;
  return accountFromStaff(roster, staff);
}

export function enqueueShiftOpen(staffId, startedAt) {
  if (!staffId || !startedAt) return;
  enqueueItem({
    id: `shift-open-${staffId}-${startedAt}`,
    type: "staff-shift-open",
    payload: { staffId, startedAt },
  });
}

export function enqueueShiftClose(staffId, endedAt) {
  if (!staffId) return;
  const end = endedAt || new Date().toISOString();
  enqueueItem({
    id: `shift-close-${staffId}-${end}`,
    type: "staff-shift-close",
    payload: { staffId, endedAt: end },
  });
}
