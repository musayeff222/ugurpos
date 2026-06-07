import bcrypt from "bcryptjs";

export function hashBranchPassword(password) {
  return bcrypt.hashSync(String(password), 10);
}

export function verifyBranchPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compareSync(String(password), hash);
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
