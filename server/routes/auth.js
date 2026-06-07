import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDb } from "../db/index.js";
import { signToken, authMiddleware } from "../middleware/auth.js";
import { getBranchesForFirm } from "../middleware/branch.js";

const router = Router();

function buildUserResponse(db, user, branchId) {
  const branch = db.prepare("SELECT * FROM branches WHERE id = ?").get(branchId);
  const branches = getBranchesForFirm(user.firm_id);

  return {
    email: user.email,
    firmId: user.firm_id,
    firmName: user.firm_name,
    branchId: branch?.id || branchId,
    branchName: branch?.name || user.branch || "ANA HESAP",
    role: user.role || "admin",
    branches,
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

  const token = signToken(user, branchId);
  res.json({
    token,
    user: buildUserResponse(db, user, branchId),
  });
});

router.get("/me", authMiddleware, (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: buildUserResponse(db, user, req.user.branchId) });
});

router.get("/branches", authMiddleware, (req, res) => {
  res.json(getBranchesForFirm(req.user.firmId));
});

router.post("/switch-branch", authMiddleware, (req, res) => {
  const { branchId } = req.body;
  if (!branchId) return res.status(400).json({ error: "branchId required" });

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  const branch = db
    .prepare("SELECT * FROM branches WHERE id = ? AND firm_id = ? AND active = 1")
    .get(branchId, user.firm_id);

  if (!branch) return res.status(403).json({ error: "Geçersiz şube" });

  db.prepare("UPDATE users SET branch_id = ?, branch = ? WHERE id = ?").run(branch.id, branch.name, user.id);

  const token = signToken(user, branch.id, branch.name);
  res.json({
    token,
    user: buildUserResponse(db, user, branch.id),
  });
});

export default router;
