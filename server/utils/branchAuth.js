import bcrypt from "bcryptjs";

export function hashBranchPassword(password) {
  return bcrypt.hashSync(String(password), 10);
}

export function verifyBranchPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compareSync(String(password), hash);
}

export const DEFAULT_BRANCH_EMAIL_DOMAIN = "ugurpos.az";

export function normalizeBranchEmail(email) {
  return String(email).trim().toLowerCase();
}

export function isValidBranchEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeBranchEmail(email));
}

export function findActiveBranchByLogin(db, login) {
  const normalized = normalizeBranchEmail(login);
  if (!normalized) return null;

  if (normalized.includes("@")) {
    return db.prepare("SELECT * FROM branches WHERE email = ? AND active = 1").get(normalized) || null;
  }

  const defaultEmail = `${normalized}@${DEFAULT_BRANCH_EMAIL_DOMAIN}`;
  const byDefaultDomain = db
    .prepare("SELECT * FROM branches WHERE email = ? AND active = 1")
    .get(defaultEmail);
  if (byDefaultDomain) return byDefaultDomain;

  const rows = db
    .prepare("SELECT * FROM branches WHERE active = 1 AND (email = ? OR email LIKE ?)")
    .all(normalized, `${normalized}@%`);
  const matches = rows.filter((row) => String(row.email || "").split("@")[0] === normalized);
  return matches.length === 1 ? matches[0] : null;
}

export function getNextBranchNumber(db, firmId) {
  const rows = db.prepare("SELECT code FROM branches WHERE firm_id = ?").all(firmId);
  let max = 0;
  for (const row of rows) {
    const n = parseInt(row.code, 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return String(max + 1);
}

export function normalizeBranchNo(code) {
  if (code === null || code === undefined) return "";
  const raw = String(code).trim().replace(/^#+/, "");
  if (!raw) return "";
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? raw : String(n);
}

export function validateBranchNo(db, firmId, branchNo, excludeBranchId = null) {
  const normalized = normalizeBranchNo(branchNo);
  if (!normalized) {
    return { error: "Şube numarası zorunludur" };
  }

  const asNumber = parseInt(normalized, 10);
  if (Number.isNaN(asNumber) || asNumber < 1 || asNumber > 99999) {
    return { error: "Şube numarası 1–99999 arasında olmalıdır" };
  }

  const rows = db.prepare("SELECT id, code FROM branches WHERE firm_id = ?").all(firmId);
  for (const row of rows) {
    if (excludeBranchId && row.id === excludeBranchId) continue;
    if (normalizeBranchNo(row.code) === normalized) {
      return { error: "Bu şube numarası başka bir şubede kullanılıyor" };
    }
  }

  return { value: normalized };
}

export function generateBranchLoginCode(db, firmId, branchName, branchCode) {
  const firmPart = String(firmId).replace(/\W/g, "").slice(-6).toUpperCase() || "FIRMA";
  const namePart = String(branchCode || branchName || "SUBE")
    .replace(/\s/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8)
    .toUpperCase() || "SUBE";

  for (let i = 0; i < 100; i++) {
    const suffix = i === 0 ? "" : String(i);
    const code = `${firmPart}-${namePart}${suffix}`;
    const exists = db.prepare("SELECT id FROM branches WHERE login_code = ?").get(code);
    if (!exists) return code;
  }

  return `${firmPart}-${Date.now().toString().slice(-6)}`;
}

export const DEFAULT_BRANCH_PASSWORD = "sube123";
