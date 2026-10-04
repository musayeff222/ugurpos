import { copyCatalogImageToBranch, deleteCatalogImage } from "./catalogImage.js";

function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildEan13(base12) {
  const digits = String(base12).padStart(12, "0").slice(-12).split("").map(Number);
  let sum = 0;
  digits.forEach((d, i) => {
    sum += d * (i % 2 === 0 ? 1 : 3);
  });
  const check = (10 - (sum % 10)) % 10;
  return `${String(base12).padStart(12, "0").slice(-12)}${check}`;
}

export function generateFirmBarcode(db, firmId) {
  const count = Number(db.prepare("SELECT COUNT(*) as c FROM firm_products WHERE firm_id = ?").get(firmId).c);
  for (let i = 0; i < 200; i++) {
    const barcode = buildEan13(`869${String(count + i + 1).padStart(9, "0")}`);
    const exists = db.prepare("SELECT id FROM firm_products WHERE firm_id = ? AND barcode = ?").get(firmId, barcode);
    if (!exists) return barcode;
  }
  return buildEan13(`869${Date.now().toString().slice(-9)}`);
}

export function generateFirmStockCode(db, firmId) {
  const count = Number(db.prepare("SELECT COUNT(*) as c FROM firm_products WHERE firm_id = ?").get(firmId).c);
  for (let i = count + 1; i < count + 500; i++) {
    const code = `STK-${String(i).padStart(4, "0")}`;
    const exists = db.prepare("SELECT id FROM firm_products WHERE firm_id = ? AND stock_code = ?").get(firmId, code);
    if (!exists) return code;
  }
  return `STK-${Date.now().toString().slice(-6)}`;
}

export function rowToFirmGroup(row) {
  if (!row) return null;
  return { id: row.id, name: row.name };
}

export function rowToFirmProduct(row, groupName = "") {
  if (!row) return null;
  return {
    id: row.id,
    groupId: row.group_id || "",
    groupName,
    barcode: row.barcode,
    stockCode: row.stock_code,
    name: row.name,
    vat: row.vat,
    buyPrice: row.buy_price,
    price1: row.price1,
    price2: row.price2,
    unit: row.unit || "Adet",
    onSalePage: !!row.on_sale_page,
    active: !!row.active,
    hasImage: !!row.image_path,
    imageUrl: row.image_path ? `/api/admin/catalog/products/${row.id}/image` : null,
    branchIds: row.branchIds || [],
    ingredients: row.ingredients || [],
  };
}

export function listFirmProductIngredients(db, firmProductId) {
  try {
    return db
      .prepare(
        "SELECT ingredient_name, grams FROM firm_product_ingredients WHERE firm_product_id = ? ORDER BY ingredient_name"
      )
      .all(firmProductId)
      .map((row) => ({ name: row.ingredient_name, grams: Number(row.grams) || 0 }));
  } catch {
    return [];
  }
}

export function setFirmProductIngredients(db, firmProductId, items) {
  db.prepare("DELETE FROM firm_product_ingredients WHERE firm_product_id = ?").run(firmProductId);
  const insert = db.prepare(
    "INSERT INTO firm_product_ingredients (firm_product_id, ingredient_name, grams) VALUES (?, ?, ?)"
  );
  const seen = new Set();
  for (const item of items || []) {
    const name = String(item?.name || "").trim();
    const grams = Number(item?.grams);
    const key = name.toLocaleLowerCase("tr-TR");
    if (!name || !Number.isFinite(grams) || grams <= 0 || seen.has(key)) continue;
    seen.add(key);
    insert.run(firmProductId, name, grams);
  }
}

export function listProductionIngredientNames(db, firmId) {
  try {
    return db
      .prepare(
        `SELECT DISTINCT pp.name AS name
         FROM production_products pp
         INNER JOIN branches b ON b.id = pp.branch_id
         WHERE b.firm_id = ? AND b.kind = 'production' AND TRIM(pp.name) != ''
         ORDER BY pp.name`
      )
      .all(firmId)
      .map((row) => row.name);
  } catch {
    return [];
  }
}

export function listFirmGroups(db, firmId) {
  return db
    .prepare("SELECT * FROM firm_groups WHERE firm_id = ? ORDER BY name")
    .all(firmId)
    .map(rowToFirmGroup);
}

function salesBranches(db, firmId) {
  return db
    .prepare(
      `SELECT * FROM branches
       WHERE firm_id = ? AND (kind IS NULL OR kind != 'production')
       ORDER BY name`
    )
    .all(firmId);
}

function productBranchIds(db, firmProductId) {
  try {
    return db
      .prepare("SELECT branch_id FROM firm_product_branches WHERE firm_product_id = ?")
      .all(firmProductId)
      .map((row) => row.branch_id);
  } catch {
    return [];
  }
}

export function listFirmProducts(db, firmId) {
  const groups = Object.fromEntries(
    db.prepare("SELECT id, name FROM firm_groups WHERE firm_id = ?").all(firmId).map((g) => [g.id, g.name])
  );
  return db
    .prepare("SELECT * FROM firm_products WHERE firm_id = ? AND active = 1 ORDER BY name")
    .all(firmId)
    .map((row) =>
      rowToFirmProduct(
        {
          ...row,
          branchIds: productBranchIds(db, row.id),
          ingredients: listFirmProductIngredients(db, row.id),
        },
        groups[row.group_id] || ""
      )
    );
}

export function ensureBranchGroup(db, branchId, firmGroup) {
  const linked = db
    .prepare("SELECT * FROM `groups` WHERE branch_id = ? AND firm_group_id = ?")
    .get(branchId, firmGroup.id);
  if (linked) {
    if (linked.name !== firmGroup.name) {
      db.prepare("UPDATE `groups` SET name = ? WHERE id = ?").run(firmGroup.name, linked.id);
    }
    return linked.id;
  }

  const byName = db
    .prepare("SELECT * FROM `groups` WHERE branch_id = ? AND name = ? AND firm_group_id IS NULL")
    .get(branchId, firmGroup.name);
  if (byName) {
    db.prepare("UPDATE `groups` SET firm_group_id = ? WHERE id = ?").run(firmGroup.id, byName.id);
    return byName.id;
  }

  const id = uid("g");
  db.prepare("INSERT INTO `groups` (id, name, branch_id, firm_group_id) VALUES (?, ?, ?, ?)").run(
    id,
    firmGroup.name,
    branchId,
    firmGroup.id
  );
  return id;
}

function upsertBranchProduct(db, firmId, branchId, firmProduct, branchGroupId) {
  const existing = db
    .prepare("SELECT * FROM products WHERE branch_id = ? AND firm_product_id = ?")
    .get(branchId, firmProduct.id);

  if (existing) {
    db.prepare(
      `UPDATE products SET barcode=?, stock_code=?, name=?, group_id=?, critical_stock=?, vat=?,
       buy_price=?, price1=?, price2=?, unit=?, on_sale_page=?, active=? WHERE id=?`
    ).run(
      firmProduct.barcode,
      firmProduct.stock_code,
      firmProduct.name,
      branchGroupId,
      Number(firmProduct.critical_stock) || 5,
      Number(firmProduct.vat) || 20,
      Number(firmProduct.buy_price) || 0,
      Number(firmProduct.price1) || 0,
      Number(firmProduct.price2) || 0,
      firmProduct.unit || "Adet",
      firmProduct.on_sale_page ? 1 : 0,
      firmProduct.active ? 1 : 0,
      existing.id
    );
    const filename = copyCatalogImageToBranch(firmId, firmProduct.image_path, branchId, existing.id);
    if (filename) {
      db.prepare("UPDATE products SET image_path = ? WHERE id = ?").run(filename, existing.id);
    } else if (!firmProduct.image_path) {
      db.prepare("UPDATE products SET image_path = NULL WHERE id = ?").run(existing.id);
    }
    return existing.id;
  }

  const id = uid("p");
  db.prepare(
    `INSERT INTO products (id, barcode, stock_code, name, group_id, stock, critical_stock, vat, buy_price, price1, price2, unit, on_sale_page, active, branch_id, firm_product_id)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    firmProduct.barcode,
    firmProduct.stock_code,
    firmProduct.name,
    branchGroupId,
    Number(firmProduct.critical_stock) || 5,
    Number(firmProduct.vat) || 20,
    Number(firmProduct.buy_price) || 0,
    Number(firmProduct.price1) || 0,
    Number(firmProduct.price2) || 0,
    firmProduct.unit || "Adet",
    firmProduct.on_sale_page ? 1 : 0,
    firmProduct.active ? 1 : 0,
    branchId,
    firmProduct.id
  );
  const filename = copyCatalogImageToBranch(firmId, firmProduct.image_path, branchId, id);
  if (filename) {
    db.prepare("UPDATE products SET image_path = ? WHERE id = ?").run(filename, id);
  }
  return id;
}

export function syncFirmGroupToAllBranches(db, firmId, firmGroup) {
  const branches = db.prepare("SELECT id FROM branches WHERE firm_id = ?").all(firmId);
  for (const branch of branches) {
    ensureBranchGroup(db, branch.id, firmGroup);
  }
}

function hideBranchCopy(db, branchId, firmProductId) {
  const existing = db
    .prepare("SELECT id FROM products WHERE branch_id = ? AND firm_product_id = ?")
    .get(branchId, firmProductId);
  if (!existing) return;
  db.prepare("UPDATE products SET active = 0, on_sale_page = 0 WHERE id = ?").run(existing.id);
}

export function syncFirmProductToAllBranches(db, firmId, firmProductId) {
  const product = db.prepare("SELECT * FROM firm_products WHERE id = ? AND firm_id = ?").get(firmProductId, firmId);
  if (!product) return;
  const group = product.group_id
    ? db.prepare("SELECT * FROM firm_groups WHERE id = ? AND firm_id = ?").get(product.group_id, firmId)
    : null;
  const selected = new Set(productBranchIds(db, product.id));
  const branches = salesBranches(db, firmId);
  for (const branch of branches) {
    if (!selected.has(branch.id) || !product.active) {
      hideBranchCopy(db, branch.id, product.id);
      continue;
    }
    const groupId = group ? ensureBranchGroup(db, branch.id, group) : null;
    upsertBranchProduct(db, firmId, branch.id, product, groupId);
  }
}

export function setFirmProductBranches(db, firmId, firmProductId, branchIds) {
  const allowed = new Set(salesBranches(db, firmId).map((branch) => branch.id));
  const selected = [...new Set((branchIds || []).filter((id) => allowed.has(id)))];
  db.prepare("DELETE FROM firm_product_branches WHERE firm_product_id = ?").run(firmProductId);
  const insert = db.prepare("INSERT INTO firm_product_branches (firm_product_id, branch_id) VALUES (?, ?)");
  selected.forEach((branchId) => insert.run(firmProductId, branchId));
  syncFirmProductToAllBranches(db, firmId, firmProductId);
  return selected;
}

export function syncFirmCatalogToBranch(db, firmId, branchId) {
  const branch = db.prepare("SELECT * FROM branches WHERE id = ? AND firm_id = ?").get(branchId, firmId);
  if (!branch || branch.kind === "production") return;
  const groups = db.prepare("SELECT * FROM firm_groups WHERE firm_id = ?").all(firmId);
  const groupMap = {};
  for (const group of groups) {
    groupMap[group.id] = ensureBranchGroup(db, branchId, group);
  }
  const products = db.prepare("SELECT * FROM firm_products WHERE firm_id = ? AND active = 1").all(firmId);
  const mark = db.prepare(
    "INSERT INTO firm_product_branches (firm_product_id, branch_id) VALUES (?, ?)"
  );
  for (const product of products) {
    const already = db
      .prepare("SELECT 1 as ok FROM firm_product_branches WHERE firm_product_id = ? AND branch_id = ?")
      .get(product.id, branchId);
    if (!already) {
      try {
        mark.run(product.id, branchId);
      } catch {
        /* duplicate */
      }
    }
    upsertBranchProduct(db, firmId, branchId, product, groupMap[product.group_id] || null);
  }
}

function ensureFirmGroupByName(db, firmId, name) {
  const label = String(name || "").trim() || "Genel";
  const existing = db
    .prepare("SELECT * FROM firm_groups WHERE firm_id = ?")
    .all(firmId)
    .find((row) => String(row.name || "").trim().toLocaleLowerCase("tr") === label.toLocaleLowerCase("tr"));
  if (existing) return existing;
  const id = uid("fg");
  db.prepare("INSERT INTO firm_groups (id, firm_id, name) VALUES (?, ?, ?)").run(id, firmId, label);
  const group = { id, name: label };
  syncFirmGroupToAllBranches(db, firmId, group);
  return group;
}

function rememberVisibility(db, firmProductId, branchId) {
  const exists = db
    .prepare("SELECT 1 as ok FROM firm_product_branches WHERE firm_product_id = ? AND branch_id = ?")
    .get(firmProductId, branchId);
  if (exists) return;
  db.prepare("INSERT INTO firm_product_branches (firm_product_id, branch_id) VALUES (?, ?)").run(firmProductId, branchId);
}

export function importExistingBranchProducts(db) {
  let firms = [];
  try {
    firms = db.prepare("SELECT DISTINCT firm_id FROM branches").all();
  } catch {
    return;
  }
  firms.forEach((firm) => importFirmBranchProducts(db, firm.firm_id));
}

function importFirmBranchProducts(db, firmId) {
  const branches = salesBranches(db, firmId);
  if (!branches.length) return;
  const ids = branches.map((branch) => branch.id);
  const rows = db
    .prepare(
      `SELECT p.*, g.name as group_name FROM products p
       LEFT JOIN \`groups\` g ON g.id = p.group_id
       WHERE p.branch_id IN (${ids.map(() => "?").join(",")}) AND COALESCE(p.active, 1) = 1`
    )
    .all(...ids);

  const catalog = db.prepare("SELECT * FROM firm_products WHERE firm_id = ?").all(firmId);
  const byId = new Map(catalog.map((row) => [row.id, row]));
  const byName = new Map(
    catalog.map((row) => [String(row.name || "").trim().toLocaleLowerCase("tr"), row])
  );

  rows.forEach((row) => {
    const name = String(row.name || "").trim();
    if (!name) return;
    const key = name.toLocaleLowerCase("tr");
    let firmProduct = row.firm_product_id ? byId.get(row.firm_product_id) : null;
    if (!firmProduct) firmProduct = byName.get(key);
    if (!firmProduct) {
      const group = ensureFirmGroupByName(db, firmId, row.group_name);
      const id = uid("fp");
      const barcode = generateFirmBarcode(db, firmId);
      const stockCode = generateFirmStockCode(db, firmId);
      db.prepare(
        `INSERT INTO firm_products
          (id, firm_id, group_id, barcode, stock_code, name, vat, buy_price, price1, price2, unit, on_sale_page, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
      ).run(
        id,
        firmId,
        group.id,
        barcode,
        stockCode,
        name,
        Number(row.vat) || 0,
        Number(row.buy_price) || 0,
        Number(row.price1) || 0,
        Number(row.price2) || 0,
        row.unit || "Adet",
        row.on_sale_page ? 1 : 0
      );
      firmProduct = db.prepare("SELECT * FROM firm_products WHERE id = ?").get(id);
      byId.set(id, firmProduct);
      byName.set(key, firmProduct);
    }
    if (row.firm_product_id !== firmProduct.id) {
      db.prepare("UPDATE products SET firm_product_id = ? WHERE id = ?").run(firmProduct.id, row.id);
    }
    rememberVisibility(db, firmProduct.id, row.branch_id);
  });
}

export function deactivateFirmProduct(db, firmId, firmProductId) {
  db.prepare("UPDATE firm_products SET active = 0 WHERE id = ? AND firm_id = ?").run(firmProductId, firmId);
  db.prepare("UPDATE products SET active = 0 WHERE firm_product_id = ?").run(firmProductId);
}

export function removeFirmGroup(db, firmId, firmGroupId) {
  const existing = db
    .prepare("SELECT id FROM firm_groups WHERE id = ? AND firm_id = ?")
    .get(firmGroupId, firmId);
  if (!existing) return { error: "Grup bulunamadı" };

  const products = db
    .prepare("SELECT id FROM firm_products WHERE firm_id = ? AND group_id = ?")
    .all(firmId, firmGroupId);
  db.prepare("UPDATE firm_products SET group_id = NULL WHERE firm_id = ? AND group_id = ?").run(
    firmId,
    firmGroupId
  );
  for (const product of products) {
    syncFirmProductToAllBranches(db, firmId, product.id);
  }

  db.prepare("DELETE FROM firm_groups WHERE id = ? AND firm_id = ?").run(firmGroupId, firmId);
  db.prepare("UPDATE `groups` SET firm_group_id = NULL WHERE firm_group_id = ?").run(firmGroupId);
  return { ok: true };
}

export function applyCatalogImageAndSync(db, firmId, productId, imagePath) {
  db.prepare("UPDATE firm_products SET image_path = ? WHERE id = ? AND firm_id = ?").run(imagePath, productId, firmId);
  syncFirmProductToAllBranches(db, firmId, productId);
}

export function clearCatalogImageAndSync(db, firmId, productId) {
  deleteCatalogImage(firmId, productId);
  db.prepare("UPDATE firm_products SET image_path = NULL WHERE id = ? AND firm_id = ?").run(productId, firmId);
  const copies = db.prepare("SELECT id, branch_id FROM products WHERE firm_product_id = ?").all(productId);
  for (const copy of copies) {
    db.prepare("UPDATE products SET image_path = NULL WHERE id = ?").run(copy.id);
  }
}
