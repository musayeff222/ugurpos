import { Router } from "express";
import { getDb, uid } from "../db/index.js";
import { rowToBranch } from "../db/migrate-branches.js";
import { adminMiddleware } from "../middleware/admin.js";
import { seedBranchDefaults } from "../utils/branchDefaults.js";

const router = Router();
router.use(adminMiddleware);

router.get("/summary", (req, res) => {
  const db = getDb();
  const firmId = req.user.firmId;
  const branchCount = db.prepare("SELECT COUNT(*) as c FROM branches WHERE firm_id = ? AND active = 1").get(firmId).c;
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE firm_id = ?").get(firmId).c;
  const branches = db
    .prepare(
      `SELECT b.*,
        (SELECT COUNT(*) FROM products p WHERE p.branch_id = b.id) as product_count,
        (SELECT COUNT(*) FROM sales s WHERE s.branch_id = b.id) as sale_count
       FROM branches b WHERE b.firm_id = ? ORDER BY b.name`
    )
    .all(firmId);

  res.json({
    firmId,
    firmName: req.user.firmName,
    branchCount,
    userCount,
    branches: branches.map((b) => ({
      ...rowToBranch(b),
      productCount: b.product_count,
      saleCount: b.sale_count,
    })),
  });
});

router.get("/branches", (req, res) => {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM branches WHERE firm_id = ? ORDER BY name")
    .all(req.user.firmId);
  res.json(rows.map(rowToBranch));
});

router.post("/branches", (req, res) => {
  const db = getDb();
  const { name, code, address, phone } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: "Şube adı zorunludur" });
  }

  const id = uid("br");
  const branchCode =
    code?.trim() ||
    String(db.prepare("SELECT COUNT(*) as c FROM branches WHERE firm_id = ?").get(req.user.firmId).c + 1).padStart(
      3,
      "0"
    );

  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO branches (id, firm_id, name, code, address, phone, active) VALUES (?, ?, ?, ?, ?, ?, 1)"
    ).run(id, req.user.firmId, name.trim(), branchCode, address || "", phone || "");
    seedBranchDefaults(db, id);
  });

  tx();
  res.status(201).json(rowToBranch(db.prepare("SELECT * FROM branches WHERE id = ?").get(id)));
});

router.patch("/branches/:id", (req, res) => {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM branches WHERE id = ? AND firm_id = ?")
    .get(req.params.id, req.user.firmId);
  if (!existing) return res.status(404).json({ error: "Şube bulunamadı" });

  const { name, code, address, phone, active } = req.body;
  db.prepare("UPDATE branches SET name=?, code=?, address=?, phone=?, active=? WHERE id=?").run(
    name ?? existing.name,
    code ?? existing.code,
    address ?? existing.address,
    phone ?? existing.phone,
    active === false ? 0 : active === true ? 1 : existing.active,
    req.params.id
  );

  res.json(rowToBranch(db.prepare("SELECT * FROM branches WHERE id = ?").get(req.params.id)));
});

router.delete("/branches/:id", (req, res) => {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM branches WHERE id = ? AND firm_id = ?")
    .get(req.params.id, req.user.firmId);
  if (!existing) return res.status(404).json({ error: "Şube bulunamadı" });

  const activeCount = db
    .prepare("SELECT COUNT(*) as c FROM branches WHERE firm_id = ? AND active = 1")
    .get(req.user.firmId).c;
  if (activeCount <= 1 && existing.active) {
    return res.status(400).json({ error: "Son aktif şube silinemez" });
  }

  db.prepare("UPDATE branches SET active = 0 WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
