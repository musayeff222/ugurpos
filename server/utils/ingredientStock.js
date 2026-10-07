import { listFirmProductIngredients } from "./firmCatalog.js";

function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function normName(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/i̇/g, "i")
    .replace(/\s+/g, " ");
}

function isGramUnit(unit) {
  const value = String(unit || "").toLocaleLowerCase("tr-TR");
  return value.includes("qram") || value.includes("gram") || value === "g" || value === "gr";
}

function branchProducts(db, branchId) {
  return db.prepare("SELECT * FROM products WHERE branch_id = ?").all(branchId);
}

function transferRows(db, branchId) {
  const rows = [];
  try {
    for (const row of db
      .prepare(
        `SELECT product_name AS name, qty_grams AS sent
         FROM production_transfers
         WHERE to_branch_id = ?`
      )
      .all(branchId)) {
      rows.push({ name: row.name, sent: Number(row.sent || 0), unit: "qram" });
    }
  } catch {
    /* cədvəl olmaya bilər */
  }
  try {
    for (const row of db
      .prepare(
        `SELECT item_name AS name, qty AS sent, unit
         FROM production_warehouse_transfers
         WHERE to_branch_id = ?`
      )
      .all(branchId)) {
      rows.push({
        name: row.name,
        sent: Number(row.sent || 0),
        unit: row.unit || "Adet",
      });
    }
  } catch {
    /* cədvəl olmaya bilər */
  }
  return rows;
}

function groupTransfers(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = normName(row.name);
    if (!key) continue;
    const sent = Number(row.sent || 0);
    const unit = row.unit || "qram";
    const prev = map.get(key);
    if (!prev) map.set(key, { name: row.name, sent, unit });
    else {
      prev.sent += sent;
      if (!isGramUnit(prev.unit) && isGramUnit(unit)) prev.unit = unit;
    }
  }
  return [...map.values()];
}

/** Şöbədən məhsul silinəndə istehsalatdan gələn qeydi də silir. */
export function clearBranchProductionIncoming(db, branchId, productName) {
  const name = String(productName || "").trim();
  if (!branchId || !name) return;
  try {
    db.prepare(
      `DELETE FROM production_transfers
       WHERE to_branch_id = ? AND LOWER(product_name) = LOWER(?)`
    ).run(branchId, name);
  } catch {
    /* ignore */
  }
  try {
    db.prepare(
      `DELETE FROM production_warehouse_transfers
       WHERE to_branch_id = ? AND LOWER(item_name) = LOWER(?)`
    ).run(branchId, name);
  } catch {
    /* ignore */
  }
}

function sameName(rows, name) {
  const key = normName(name);
  return rows.filter((row) => normName(row.name) === key);
}

function findStockRow(rows, name) {
  const matches = sameName(rows, name);
  if (!matches.length) return null;
  return (
    matches.find((row) => row.firm_product_id) ||
    matches.find((row) => isGramUnit(row.unit) && !row.firm_product_id) ||
    matches[0]
  );
}

/** Eyni adlı təkrar sətirləri bir məhsulda birləşdirir ki, yeni ad görünməsin. */
function mergeSameNameProducts(db, branchId, name) {
  const rows = sameName(branchProducts(db, branchId), name);
  if (rows.length <= 1) return rows[0] || null;
  const keep = findStockRow(rows, name);
  const stock = rows.reduce((sum, row) => sum + Number(row.stock || 0), 0);
  db.prepare("UPDATE products SET stock = ?, active = 1 WHERE id = ? AND branch_id = ?").run(
    stock,
    keep.id,
    branchId
  );
  const remove = db.prepare("DELETE FROM products WHERE id = ? AND branch_id = ?");
  for (const row of rows) {
    if (row.id === keep.id) continue;
    try {
      db.prepare("DELETE FROM stock_counts WHERE product_id = ? AND branch_id = ?").run(row.id, branchId);
      db.prepare("DELETE FROM variants WHERE product_id = ? AND branch_id = ?").run(row.id, branchId);
      db.prepare("DELETE FROM sub_products WHERE parent_product_id = ? AND branch_id = ?").run(row.id, branchId);
    } catch {
      /* bağlı sətir olmaya bilər */
    }
    remove.run(row.id, branchId);
  }
  return { ...keep, stock };
}

function insertGramProduct(db, branchId, name, stock) {
  const id = uid("p");
  const code = `GRAM${String(Date.now()).slice(-8)}`;
  db.prepare(
    `INSERT INTO products
      (id, barcode, stock_code, name, group_id, stock, critical_stock, vat, buy_price, price1, price2, unit, on_sale_page, active, branch_id)
     VALUES (?, ?, ?, ?, NULL, ?, 0, 0, 0, 0, 0, 'qram', 0, 1, ?)`
  ).run(id, code, code, name, stock, branchId);
  return { id, stock };
}

/** Göndərilmiş məhsulun təkrar sətirlərini mövcud şöbə məhsulunun üstünə yığır. */
export function reconcileProductionGramStock(db, branchId) {
  const groups = groupTransfers(transferRows(db, branchId));
  for (const group of groups) {
    if (!(Number(group.sent) > 0)) continue;
    mergeSameNameProducts(db, branchId, group.name);
  }
}

export function addProductionGrams(db, branchId, name, qtyGrams) {
  const qty = Number(qtyGrams) || 0;
  mergeSameNameProducts(db, branchId, name);
  const target = findStockRow(branchProducts(db, branchId), name);
  if (!target) return insertGramProduct(db, branchId, name, qty);
  const stock = Number(target.stock || 0) + qty;
  db.prepare("UPDATE products SET stock = ?, active = 1 WHERE id = ? AND branch_id = ?").run(
    stock,
    target.id,
    branchId
  );
  return { id: target.id, stock };
}

function insertPieceProduct(db, branchId, name, stock, unit = "Adet") {
  const id = uid("p");
  const code = `WH${String(Date.now()).slice(-8)}`;
  db.prepare(
    `INSERT INTO products
      (id, barcode, stock_code, name, group_id, stock, critical_stock, vat, buy_price, price1, price2, unit, on_sale_page, active, branch_id)
     VALUES (?, ?, ?, ?, NULL, ?, 0, 0, 0, 0, 0, ?, 0, 1, ?)`
  ).run(id, code, code, name, stock, unit || "Adet", branchId);
  return { id, stock };
}

/** Anbardan göndərilən ədəd stoku şöbədə eyni adlı məhsulun üstünə yazır. */
export function addBranchPieceStock(db, branchId, name, qty, unit = "Adet") {
  const amount = Number(qty) || 0;
  mergeSameNameProducts(db, branchId, name);
  const rows = branchProducts(db, branchId);
  const matches = sameName(rows, name);
  const target =
    matches.find((row) => row.firm_product_id) ||
    matches.find((row) => !isGramUnit(row.unit)) ||
    matches[0] ||
    null;
  if (!target) return insertPieceProduct(db, branchId, name, amount, unit);
  const stock = Number(target.stock || 0) + amount;
  db.prepare("UPDATE products SET stock = ?, active = 1 WHERE id = ? AND branch_id = ?").run(
    stock,
    target.id,
    branchId
  );
  return { id: target.id, stock };
}

export function branchIngredientStock(db, branchId, name) {
  const match = findStockRow(branchProducts(db, branchId), name);
  return Number(match?.stock || 0);
}

export function listBranchProductionGrams(db, branchId) {
  reconcileProductionGramStock(db, branchId);
  const groups = groupTransfers(transferRows(db, branchId));
  const rows = branchProducts(db, branchId);
  const existing = new Set(rows.map((row) => normName(row.name)).filter(Boolean));
  return groups
    .filter((group) => existing.has(normName(group.name)))
    .map((group) => {
      const sent = Number(group.sent || 0);
      const stock = findStockRow(rows, group.name);
      const remaining = Number(stock?.stock || 0);
      const unit = stock?.unit || group.unit || "qram";
      return {
        name: group.name,
        unit,
        sentGrams: sent,
        remainingGrams: remaining,
        usedGrams: Math.max(0, sent - remaining),
      };
    });
}

function resolveFirmProductId(db, branchId, sold) {
  if (sold?.firm_product_id) return sold.firm_product_id;
  const branch = db.prepare("SELECT firm_id FROM branches WHERE id = ?").get(branchId);
  if (!branch?.firm_id || !sold?.name) return null;
  try {
    const firmProducts = db.prepare("SELECT id, name FROM firm_products WHERE firm_id = ?").all(branch.firm_id);
    const key = normName(sold.name);
    return firmProducts.find((row) => normName(row.name) === key)?.id || null;
  } catch {
    return null;
  }
}

function findIngredientStock(db, branchId, name) {
  return findStockRow(branchProducts(db, branchId), name);
}

/** Satılan kataloq məhsulunun tərkib qramını şubə stokundan çıxır və ya geri qaytarır. */
export function adjustRecipeStock(db, branchId, soldProductId, saleQty, direction) {
  const qty = Number(saleQty) || 0;
  if (!soldProductId || qty <= 0) return;
  reconcileProductionGramStock(db, branchId);

  const sold = db
    .prepare("SELECT id, name, unit, firm_product_id FROM products WHERE id = ? AND branch_id = ?")
    .get(soldProductId, branchId);
  if (!sold) return;

  const firmProductId = resolveFirmProductId(db, branchId, sold);
  if (!firmProductId) return;

  const recipes = listFirmProductIngredients(db, firmProductId);
  const deduct = db.prepare(
    "UPDATE products SET stock = CASE WHEN stock - ? < 0 THEN 0 ELSE stock - ? END WHERE id = ? AND branch_id = ?"
  );
  const restore = db.prepare("UPDATE products SET stock = stock + ? WHERE id = ? AND branch_id = ?");

  for (const recipe of recipes) {
    const grams = Number(recipe.grams) * qty;
    if (!(grams > 0)) continue;
    const stock = findIngredientStock(db, branchId, recipe.name);
    if (!stock || stock.id === sold.id) continue;
    if (direction === "restore") restore.run(grams, stock.id, branchId);
    else deduct.run(grams, grams, stock.id, branchId);
  }
}
