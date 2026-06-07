import { getDb } from "../db/index.js";

export function branchMiddleware(req, res, next) {
  const db = getDb();
  const branchId = req.user.branchId;

  if (!branchId) {
    return res.status(400).json({ error: "Şube seçimi gerekli" });
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
      branchNo: row.code ? String(parseInt(row.code, 10) || row.code) : "",
      email: row.email || "",
      address: row.address || "",
      phone: row.phone || "",
      active: !!row.active,
      createdAt: row.created_at,
    }));
}
