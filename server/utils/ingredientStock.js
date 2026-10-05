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
  try {
    return db
      .prepare(
        `SELECT product_name AS name, qty_grams AS sent
         FROM production_transfers
         WHERE to_branch_id = ?`
      )
      .all(branchId);
  } catch {
    return [];
  }
}

function groupTransfers(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = normName(row.name);
    if (!key) continue;
    const sent = Number(row.sent || 0);
    const prev = map.get(key);
    if (!prev) map.set(key, { name: row.name, sent });
    else prev.sent += sent;
  }
  return [...map.values()];
}

function sameName(rows, name) {
  const key = normName(name);
  return rows.filter((row) => normName(row.name) === key);
}

function findGramRow(rows, name) {
  return sameName(rows, name).find((row) => isGramUnit(row.unit) && !row.firm_product_id) || null;
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

/**
 * Köhnə göndərişlər qramı satış məhsulunun ədəd stokuna əlavə edibsə,
 * həmin hissəni ayrıca qram sətrinə köçürür. Satış məhsulu ədəd qalır.
 */
export function reconcileProductionGramStock(db, branchId) {
  const groups = groupTransfers(transferRows(db, branchId));
  for (const group of groups) {
    const sent = Number(group.sent || 0);
    if (!(sent > 0)) continue;
    const rows = branchProducts(db, branchId);
    if (findGramRow(rows, group.name)) continue;
    const catalog = sameName(rows, group.name).find((row) => row.firm_product_id || !isGramUnit(row.unit));
    if (!catalog) continue;
    const current = Number(catalog.stock || 0);
    const moved = Math.min(Math.max(current, 0), sent);
    insertGramProduct(db, branchId, group.name, moved);
    const leftover = Math.max(0, current - moved);
    if (catalog.firm_product_id && isGramUnit(catalog.unit)) {
      db.prepare("UPDATE products SET stock = ?, unit = 'Adet' WHERE id = ? AND branch_id = ?").run(
        leftover,
        catalog.id,
        branchId
      );
    } else {
      db.prepare("UPDATE products SET stock = ? WHERE id = ? AND branch_id = ?").run(leftover, catalog.id, branchId);
    }
  }
}

export function addProductionGrams(db, branchId, name, qtyGrams) {
  const qty = Number(qtyGrams) || 0;
  const rows = branchProducts(db, branchId);
  const gram = findGramRow(rows, name);
  if (!gram) {
    return insertGramProduct(db, branchId, name, qty);
  }
  const stock = Number(gram.stock || 0) + qty;
  db.prepare(
    "UPDATE products SET stock = ?, unit = 'qram', active = 1 WHERE id = ? AND branch_id = ?"
  ).run(stock, gram.id, branchId);
  return { id: gram.id, stock };
}

export function branchIngredientStock(db, branchId, name) {
  const rows = branchProducts(db, branchId);
  const gram = findGramRow(rows, name);
  if (gram) return Number(gram.stock || 0);
  const match = sameName(rows, name).find((row) => isGramUnit(row.unit)) || sameName(rows, name)[0];
  return Number(match?.stock || 0);
}

export function listBranchProductionGrams(db, branchId) {
  reconcileProductionGramStock(db, branchId);
  const groups = groupTransfers(transferRows(db, branchId));
  const rows = branchProducts(db, branchId);
  return groups.map((group) => {
    const sent = Number(group.sent || 0);
    const gram = findGramRow(rows, group.name) || sameName(rows, group.name).find((row) => isGramUnit(row.unit));
    const remaining = Number(gram?.stock || 0);
    return {
      name: group.name,
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
  const rows = branchProducts(db, branchId);
  const gram = findGramRow(rows, name);
  if (gram) return gram;
  const matches = sameName(rows, name);
  matches.sort((a, b) => {
    const ag = isGramUnit(a.unit) ? 0 : 1;
    const bg = isGramUnit(b.unit) ? 0 : 1;
    if (ag !== bg) return ag - bg;
    return (a.firm_product_id ? 1 : 0) - (b.firm_product_id ? 1 : 0);
  });
  return matches[0] || null;
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
