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

function actorName(req) {
  return req.user?.staffName || req.user?.email || req.user?.branchName || "İstifadəçi";
}

function rowToRawMaterial(row) {
  const stock = Number(row.stock || 0);
  const critical = Number(row.critical_stock ?? 5);
  return {
    id: row.id,
    name: row.name,
    unit: row.unit || "kq",
    stock,
    note: row.note || "",
    criticalStock: critical,
    lowStock: stock > 0 && stock <= critical,
    critical: stock <= 0,
    createdAt: row.created_at || "",
  };
}

function rowToProduct(row) {
  return { id: row.id, name: row.name, createdAt: row.created_at || "" };
}

function rowToMovement(row) {
  return {
    id: row.id,
    rawMaterialId: row.raw_material_id,
    type: row.type,
    qty: Number(row.qty || 0),
    stockAfter: Number(row.stock_after || 0),
    note: row.note || "",
    batchId: row.batch_id || "",
    createdBy: row.created_by || "",
    createdAt: row.created_at || "",
  };
}

function insertMovement(db, { branchId, materialId, type, qty, stockAfter, note, batchId, createdBy, createdAt }) {
  db.prepare(
    `INSERT INTO raw_material_movements
      (id, branch_id, raw_material_id, type, qty, stock_after, note, batch_id, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(uid("rmm"), branchId, materialId, type, qty, stockAfter, note || "", batchId || "", createdBy || "", createdAt);
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
    productId: row.product_id || "",
    productName: row.product_name,
    qty: Number(row.qty || 0),
    unit: row.unit || "əd",
    note: row.note || "",
    createdAt: row.created_at || "",
    items,
  };
}

router.get("/summary", (req, res) => {
  const db = getDb();
  const materials = db.prepare("SELECT * FROM raw_materials WHERE branch_id = ? ORDER BY name").all(req.branchId).map(rowToRawMaterial);
  const products = db.prepare("SELECT * FROM production_products WHERE branch_id = ? ORDER BY name").all(req.branchId).map(rowToProduct);
  const batchIds = db
    .prepare("SELECT id FROM production_batches WHERE branch_id = ? ORDER BY created_at DESC LIMIT 8")
    .all(req.branchId);
  const recentBatches = batchIds.map(({ id }) => loadBatch(db, id, req.branchId)).filter(Boolean);
  const recentUsage = db
    .prepare(
      `SELECT m.*, r.name as material_name, r.unit as unit, b.product_name
       FROM raw_material_movements m
       LEFT JOIN raw_materials r ON r.id = m.raw_material_id
       LEFT JOIN production_batches b ON b.id = m.batch_id
       WHERE m.branch_id = ? AND m.type = 'out'
       ORDER BY m.created_at DESC LIMIT 8`
    )
    .all(req.branchId)
    .map((row) => ({
      ...rowToMovement(row),
      materialName: row.material_name || "",
      unit: row.unit || "",
      productName: row.product_name || "",
    }));

  res.json({
    materialCount: materials.length,
    productCount: products.length,
    batchCount: Number(db.prepare("SELECT COUNT(*) as c FROM production_batches WHERE branch_id = ?").get(req.branchId).c || 0),
    lowStock: materials.filter((m) => m.lowStock),
    criticalStock: materials.filter((m) => m.critical),
    recentUsage,
    recentBatches,
    materials,
    products,
  });
});

router.get("/raw-materials", (req, res) => {
  res.json(
    getDb()
      .prepare("SELECT * FROM raw_materials WHERE branch_id = ? ORDER BY name")
      .all(req.branchId)
      .map(rowToRawMaterial)
  );
});

router.post("/raw-materials", (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Xammalın adı yazılmalıdır" });
  const id = uid("rm");
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      "INSERT INTO raw_materials (id, branch_id, name, unit, stock, note, critical_stock, created_at) VALUES (?, ?, ?, ?, 0, ?, 5, ?)"
    )
    .run(id, req.branchId, name, String(req.body.unit || "kq").trim() || "kq", String(req.body.note || "").trim(), createdAt);
  res.status(201).json(rowToRawMaterial(getDb().prepare("SELECT * FROM raw_materials WHERE id = ?").get(id)));
});

router.patch("/raw-materials/:id", (req, res) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM raw_materials WHERE id = ? AND branch_id = ?").get(req.params.id, req.branchId);
  if (!existing) return res.status(404).json({ error: "Xammal tapılmadı" });
  const name = req.body.name !== undefined ? String(req.body.name).trim() : existing.name;
  if (!name) return res.status(400).json({ error: "Xammalın adı yazılmalıdır" });
  const unit = req.body.unit !== undefined ? String(req.body.unit).trim() || existing.unit : existing.unit;
  db.prepare("UPDATE raw_materials SET name=?, unit=? WHERE id=? AND branch_id=?").run(name, unit, existing.id, req.branchId);
  res.json(rowToRawMaterial(db.prepare("SELECT * FROM raw_materials WHERE id = ?").get(existing.id)));
});

router.post("/raw-materials/:id/stock", (req, res) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM raw_materials WHERE id = ? AND branch_id = ?").get(req.params.id, req.branchId);
  if (!existing) return res.status(404).json({ error: "Xammal tapılmadı" });
  const qty = Number(req.body.qty);
  if (Number.isNaN(qty) || qty <= 0) return res.status(400).json({ error: "Stok miqdarı düzgün deyil" });
  const next = Number(existing.stock || 0) + qty;
  const createdAt = new Date().toISOString();
  const tx = db.transaction(() => {
    db.prepare("UPDATE raw_materials SET stock = ? WHERE id = ? AND branch_id = ?").run(next, existing.id, req.branchId);
    insertMovement(db, {
      branchId: req.branchId,
      materialId: existing.id,
      type: "in",
      qty,
      stockAfter: next,
      note: String(req.body.note || "Stok əlavə").trim(),
      createdBy: actorName(req),
      createdAt,
    });
  });
  tx();
  res.json(rowToRawMaterial(db.prepare("SELECT * FROM raw_materials WHERE id = ?").get(existing.id)));
});

router.get("/raw-materials/:id/movements", (req, res) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM raw_materials WHERE id = ? AND branch_id = ?").get(req.params.id, req.branchId);
  if (!existing) return res.status(404).json({ error: "Xammal tapılmadı" });
  const movements = db
    .prepare(
      `SELECT m.*, b.product_name
       FROM raw_material_movements m
       LEFT JOIN production_batches b ON b.id = m.batch_id
       WHERE m.branch_id = ? AND m.raw_material_id = ?
       ORDER BY m.created_at DESC`
    )
    .all(req.branchId, existing.id)
    .map((row) => ({ ...rowToMovement(row), productName: row.product_name || "" }));
  res.json({ material: rowToRawMaterial(existing), movements });
});

router.delete("/raw-materials/:id", (req, res) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM raw_materials WHERE id = ? AND branch_id = ?").get(req.params.id, req.branchId);
  if (!existing) return res.status(404).json({ error: "Xammal tapılmadı" });
  db.prepare("DELETE FROM raw_materials WHERE id = ? AND branch_id = ?").run(existing.id, req.branchId);
  res.json({ ok: true });
});

router.get("/products", (req, res) => {
  res.json(
    getDb()
      .prepare("SELECT * FROM production_products WHERE branch_id = ? ORDER BY name")
      .all(req.branchId)
      .map(rowToProduct)
  );
});

router.post("/products", (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Məhsul adı yazılmalıdır" });
  const id = uid("pp");
  const createdAt = new Date().toISOString();
  getDb()
    .prepare("INSERT INTO production_products (id, branch_id, name, created_at) VALUES (?, ?, ?, ?)")
    .run(id, req.branchId, name, createdAt);
  res.status(201).json(rowToProduct(getDb().prepare("SELECT * FROM production_products WHERE id = ?").get(id)));
});

router.get("/products/:id/history", (req, res) => {
  const db = getDb();
  const product = db.prepare("SELECT * FROM production_products WHERE id = ? AND branch_id = ?").get(req.params.id, req.branchId);
  if (!product) return res.status(404).json({ error: "Məhsul tapılmadı" });
  const ids = db
    .prepare("SELECT id FROM production_batches WHERE branch_id = ? AND product_id = ? ORDER BY created_at DESC")
    .all(req.branchId, product.id);
  res.json({ product: rowToProduct(product), batches: ids.map(({ id }) => loadBatch(db, id, req.branchId)).filter(Boolean) });
});

router.get("/batches", (req, res) => {
  const db = getDb();
  const ids = db.prepare("SELECT id FROM production_batches WHERE branch_id = ? ORDER BY created_at DESC").all(req.branchId);
  res.json(ids.map(({ id }) => loadBatch(db, id, req.branchId)).filter(Boolean));
});

router.post("/batches", (req, res) => {
  const db = getDb();
  let productName = String(req.body.productName || "").trim();
  let productId = String(req.body.productId || "").trim();
  if (productId) {
    const product = db.prepare("SELECT * FROM production_products WHERE id = ? AND branch_id = ?").get(productId, req.branchId);
    if (!product) return res.status(404).json({ error: "Hazırlanan məhsul tapılmadı" });
    productName = product.name;
  }
  if (!productName) return res.status(400).json({ error: "Məhsul seçin" });
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const usedItems = items.filter((item) => Number(item.qty) > 0);
  if (!usedItems.length) return res.status(400).json({ error: "Ən az bir xammal miqdarı yazın" });

  const createdAt = new Date().toISOString();
  const id = uid("pb");

  try {
    const tx = db.transaction(() => {
      const lines = usedItems.map((item) => {
        const rawId = String(item.rawMaterialId || "").trim();
        const used = Number(item.qty);
        if (!rawId) throw new Error("Xammal seçin");
        if (Number.isNaN(used) || used <= 0) throw new Error("Xammal miqdarı düzgün deyil");
        const material = db.prepare("SELECT * FROM raw_materials WHERE id = ? AND branch_id = ?").get(rawId, req.branchId);
        if (!material) throw new Error("Xammal tapılmadı");
        const stock = Number(material.stock || 0);
        if (used > stock) throw new Error(`${material.name} stokda yetərli deyil (${stock} ${material.unit || ""})`);
        return { material, used };
      });

      db.prepare(
        "INSERT INTO production_batches (id, branch_id, product_id, product_name, qty, unit, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(id, req.branchId, productId || "", productName, 1, "əd", String(req.body.note || "").trim(), createdAt);

      const insertItem = db.prepare(
        "INSERT INTO production_batch_items (id, batch_id, raw_material_id, raw_material_name, qty) VALUES (?, ?, ?, ?, ?)"
      );
      const updateStock = db.prepare("UPDATE raw_materials SET stock = ? WHERE id = ? AND branch_id = ?");
      lines.forEach((line) => {
        const next = Number(line.material.stock || 0) - line.used;
        insertItem.run(uid("pbi"), id, line.material.id, line.material.name, line.used);
        updateStock.run(next, line.material.id, req.branchId);
        insertMovement(db, {
          branchId: req.branchId,
          materialId: line.material.id,
          type: "out",
          qty: line.used,
          stockAfter: next,
          note: productName,
          batchId: id,
          createdBy: actorName(req),
          createdAt,
        });
      });
    });
    tx();
  } catch (err) {
    return res.status(400).json({ error: err.message || "İstifadə qeydə alınmadı" });
  }

  res.status(201).json(loadBatch(db, id, req.branchId));
});

export default router;
