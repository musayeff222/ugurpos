import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDb } from "../db/index.js";
import { rowToBranch } from "../db/migrate-branches.js";
import { signAdminToken, signBranchToken, authMiddleware } from "../middleware/auth.js";
import { getBranchesForFirm } from "../middleware/branch.js";
import { verifyBranchPassword, normalizeBranchEmail } from "../utils/branchAuth.js";
import { logActivity } from "../utils/activityLog.js";

const router = Router();

function getFirmName(db, firmId) {
  const user = db.prepare("SELECT firm_name FROM users WHERE firm_id = ? LIMIT 1").get(firmId);
  return user?.firm_name || "Firma";
}

function buildAdminResponse(db, user, branchId) {
  const branch = db.prepare("SELECT * FROM branches WHERE id = ?").get(branchId);
  const branches = getBranchesForFirm(user.firm_id);

  return {
    email: user.email,
    firmId: user.firm_id,
    firmName: user.firm_name,
    branchId: branch?.id || branchId,
    branchName: branch?.name || user.branch || "ANA HESAP",
    branchNo: branch?.code ? String(parseInt(branch.code, 10) || branch.code) : "",
    email: branch?.email || "",
    role: user.role || "admin",
    loginType: "admin",
    branches,
  };
}

function buildBranchResponse(db, branch) {
  const firmName = getFirmName(db, branch.firm_id);
  return {
    email: null,
    firmId: branch.firm_id,
    firmName,
    branchId: branch.id,
    branchName: branch.name,
    branchNo: branch.code ? String(parseInt(branch.code, 10) || branch.code) : "",
    email: branch.email,
    role: "branch",
    loginType: "branch",
    branches: [rowToBranch(branch)],
  };
}

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const branchId =
    user.branch_id ||
    db.prepare("SELECT id FROM branches WHERE firm_id = ? AND active = 1 ORDER BY name LIMIT 1").get(user.firm_id)?.id;

  const token = signAdminToken(user, branchId);
  logActivity(db, {
    firmId: user.firm_id,
    type: "admin_login",
    title: "Admin girişi",
    detail: user.email,
  });
  res.json({
    token,
    user: buildAdminResponse(db, user, branchId),
  });
});

router.post("/branch-login", (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: "E-posta ve parola gerekli" });
  }

  const db = getDb();
  const branch = db
    .prepare("SELECT * FROM branches WHERE email = ? AND active = 1")
    .get(normalizeBranchEmail(email));

  if (!branch || !verifyBranchPassword(password, branch.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const firmName = getFirmName(db, branch.firm_id);
  const token = signBranchToken(branch, firmName);
  logActivity(db, {
    firmId: branch.firm_id,
    branchId: branch.id,
    branchName: branch.name,
    type: "branch_login",
    title: `${branch.name} giriş yaptı`,
    detail: branch.email,
  });
  res.json({
    token,
    user: buildBranchResponse(db, branch),
  });
});

router.get("/me", authMiddleware, (req, res) => {
  const db = getDb();

  if (req.user.loginType === "branch" || req.user.role === "branch") {
    const branch = db.prepare("SELECT * FROM branches WHERE id = ?").get(req.user.branchId);
    if (!branch) return res.status(404).json({ error: "Branch not found" });
    return res.json({ user: buildBranchResponse(db, branch) });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: buildAdminResponse(db, user, req.user.branchId) });
});

router.get("/branches", authMiddleware, (req, res) => {
  const db = getDb();

  if (req.user.role === "branch" || req.user.impersonating) {
    const branch = db.prepare("SELECT * FROM branches WHERE id = ?").get(req.user.branchId);
    return res.json(branch ? [rowToBranch(branch)] : []);
  }

  res.json(getBranchesForFirm(req.user.firmId));
});

export default router;
