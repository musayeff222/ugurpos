import { getDb } from "../db/index.js";

export function branchMiddleware(req, res, next) {
  const db = getDb();

  let branchId = req.user.branchId;
  if (req.user.role === "admin") {
    branchId = req.headers["x-branch-id"] || req.user.branchId;
  }

  if (!branchId) {
    return res.status(400).json({ error: "Şube seçimi gerekli" });
  }

  if (req.user.role === "branch" && branchId !== req.user.branchId) {
    return res.status(403).json({ error: "Bu şubeye erişim yetkiniz yok" });
  }

  const branch = db
    .prepare("SELECT * FROM branches WHERE id = ? AND firm_id = ? AND active = 1")
    .get(branchId, req.user.firmId);

  if (!branch) {
    return res.status(403).json({ error: "Geçersiz şube" });
  }

  req.branchId = branchId;
  req.branchName = branch.name;
  next();
}

export function getBranchesForFirm(firmId) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM branches WHERE firm_id = ? ORDER BY name")
    .all(firmId)
    .map((row) => ({
      id: row.id,
      firmId: row.firm_id,
      name: row.name,
      code: row.code || "",
      loginCode: row.login_code || "",
      address: row.address || "",
      phone: row.phone || "",
      active: !!row.active,
      createdAt: row.created_at,
    }));
}
