import { Router } from "express";
import { getDb, uid } from "../db/index.js";
import { branchMiddleware } from "../middleware/branch.js";
import { isProductionBranch } from "../utils/branchKind.js";

const router = Router();
router.use(branchMiddleware);

function requireProduction(req, res, next) {
  const branch = getDb().prepare("SELECT * FROM branches WHERE id = ?").get(req.branchId);
  if (!isProductionBranch(branch)) {
    return res.status(403).json({ error: "Bu şube istehsalat şubesi değil" });
  }
  next();
}

router.use(requireProduction);

function rowToRawMaterial(row) {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit || "kq",
    stock: Number(row.stock || 0),
    note: row.note || "",
    createdAt: row.created_at || "",
  };
}

function loadBatch(db, id, branchId) {
  const row = db.prepare("SELECT * FROM production_batches WHERE id = ? AND branch_id = ?").get(id, branchId);
  if (!row) return null;
  const items = db
    .prepare("SELECT * FROM production_batch_items WHERE batch_id = ?")
    .all(id)
    .map((item) => ({
      id: item.id,
      rawMaterialId: item.raw_material_id || "",
      rawMaterialName: item.raw_material_name || "",
      qty: Number(item.qty || 0),
    }));
  return {
    id: row.id,
    productName: row.product_name,
    qty: Number(row.qty || 0),
    unit: row.unit || "əd",
    note: row.note || "",
    createdAt: row.created_at || "",
    items,
  };
}

router.get("/raw-materials", (req, res) => {
  const rows = getDb()
    .prepare("SELECT * FROM raw_materials WHERE branch_id = ? ORDER BY name")
    .all(req.branchId)
    .map(rowToRawMaterial);
  res.json(rows);
});

router.post("/raw-materials", (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Xam maddə adı zorunludur" });
  const stock = Number(req.body.stock);
  if (Number.isNaN(stock) || stock < 0) return res.status(400).json({ error: "Geçerli stok girin" });
  const id = uid("rm");
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      "INSERT INTO raw_materials (id, branch_id, name, unit, stock, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(id, req.branchId, name, String(req.body.unit || "kq").trim() || "kq", stock, String(req.body.note || "").trim(), createdAt);
  const row = getDb().prepare("SELECT * FROM raw_materials WHERE id = ?").get(id);
  res.status(201).json(rowToRawMaterial(row));
});

router.patch("/raw-materials/:id", (req, res) => {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM raw_materials WHERE id = ? AND branch_id = ?")
    .get(req.params.id, req.branchId);
  if (!existing) return res.status(404).json({ error: "Xam maddə bulunamadı" });
  const name = req.body.name !== undefined ? String(req.body.name).trim() : existing.name;
  if (!name) return res.status(400).json({ error: "Xam maddə adı zorunludur" });
  const stock = req.body.stock !== undefined ? Number(req.body.stock) : Number(existing.stock || 0);
  if (Number.isNaN(stock) || stock < 0) return res.status(400).json({ error: "Geçerli stok girin" });
  db.prepare("UPDATE raw_materials SET name=?, unit=?, stock=?, note=? WHERE id=? AND branch_id=?").run(
    name,
    req.body.unit !== undefined ? String(req.body.unit).trim() || existing.unit : existing.unit,
    stock,
    req.body.note !== undefined ? String(req.body.note).trim() : existing.note || "",
    existing.id,
    req.branchId
  );
  res.json(rowToRawMaterial(db.prepare("SELECT * FROM raw_materials WHERE id = ?").get(existing.id)));
});

router.delete("/raw-materials/:id", (req, res) => {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM raw_materials WHERE id = ? AND branch_id = ?")
    .get(req.params.id, req.branchId);
  if (!existing) return res.status(404).json({ error: "Xam maddə bulunamadı" });
  db.prepare("DELETE FROM raw_materials WHERE id = ? AND branch_id = ?").run(existing.id, req.branchId);
  res.json({ ok: true });
});

router.get("/batches", (req, res) => {
  const db = getDb();
  const ids = db
    .prepare("SELECT id FROM production_batches WHERE branch_id = ? ORDER BY created_at DESC")
    .all(req.branchId);
  res.json(ids.map(({ id }) => loadBatch(db, id, req.branchId)).filter(Boolean));
});

router.post("/batches", (req, res) => {
  const productName = String(req.body.productName || "").trim();
  if (!productName) return res.status(400).json({ error: "Məhsul adı zorunludur" });
  const qty = Number(req.body.qty);
  if (Number.isNaN(qty) || qty <= 0) return res.status(400).json({ error: "Geçerli miqdar girin" });
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ error: "Ən az bir xam maddə seçin" });

  const db = getDb();
  const createdAt = new Date().toISOString();
  const id = uid("pb");

  try {
    const tx = db.transaction(() => {
      const lines = items.map((item) => {
        const rawId = String(item.rawMaterialId || "").trim();
        const used = Number(item.qty);
        if (!rawId) throw new Error("Xam maddə seçin");
        if (Number.isNaN(used) || used <= 0) throw new Error("Xam maddə miqdarı geçersiz");
        const material = db
          .prepare("SELECT * FROM raw_materials WHERE id = ? AND branch_id = ?")
          .get(rawId, req.branchId);
        if (!material) throw new Error("Xam maddə bulunamadı");
        const stock = Number(material.stock || 0);
        if (used > stock) throw new Error(`${material.name} stokta yetmez (${stock})`);
        return { material, used };
      });

      db.prepare(
        "INSERT INTO production_batches (id, branch_id, product_name, qty, unit, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(
        id,
        req.branchId,
        productName,
        qty,
        String(req.body.unit || "əd").trim() || "əd",
        String(req.body.note || "").trim(),
        createdAt
      );

      const insertItem = db.prepare(
        "INSERT INTO production_batch_items (id, batch_id, raw_material_id, raw_material_name, qty) VALUES (?, ?, ?, ?, ?)"
      );
      const updateStock = db.prepare("UPDATE raw_materials SET stock = ? WHERE id = ? AND branch_id = ?");
      lines.forEach((line) => {
        insertItem.run(uid("pbi"), id, line.material.id, line.material.name, line.used);
        updateStock.run(Number(line.material.stock || 0) - line.used, line.material.id, req.branchId);
      });
    });
    tx();
  } catch (err) {
    return res.status(400).json({ error: err.message || "İstehsalat kaydı alınamadı" });
  }

  res.status(201).json(loadBatch(db, id, req.branchId));
});

export default router;
