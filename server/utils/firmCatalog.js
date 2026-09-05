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
  };
}

export function listFirmGroups(db, firmId) {
  return db
    .prepare("SELECT * FROM firm_groups WHERE firm_id = ? ORDER BY name")
    .all(firmId)
    .map(rowToFirmGroup);
}

export function listFirmProducts(db, firmId) {
  const groups = Object.fromEntries(
    db.prepare("SELECT id, name FROM firm_groups WHERE firm_id = ?").all(firmId).map((g) => [g.id, g.name])
  );
  return db
    .prepare("SELECT * FROM firm_products WHERE firm_id = ? ORDER BY name")
    .all(firmId)
    .map((row) => rowToFirmProduct(row, groups[row.group_id] || ""));
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

export function syncFirmProductToAllBranches(db, firmId, firmProductId) {
  const product = db.prepare("SELECT * FROM firm_products WHERE id = ? AND firm_id = ?").get(firmProductId, firmId);
  if (!product) return;
  const group = product.group_id
    ? db.prepare("SELECT * FROM firm_groups WHERE id = ? AND firm_id = ?").get(product.group_id, firmId)
    : null;
  const branches = db.prepare("SELECT id FROM branches WHERE firm_id = ?").all(firmId);
  for (const branch of branches) {
    const groupId = group ? ensureBranchGroup(db, branch.id, group) : null;
    upsertBranchProduct(db, firmId, branch.id, product, groupId);
  }
}

export function syncFirmCatalogToBranch(db, firmId, branchId) {
  const groups = db.prepare("SELECT * FROM firm_groups WHERE firm_id = ?").all(firmId);
  const groupMap = {};
  for (const group of groups) {
    groupMap[group.id] = ensureBranchGroup(db, branchId, group);
  }
  const products = db.prepare("SELECT * FROM firm_products WHERE firm_id = ?").all(firmId);
  for (const product of products) {
    upsertBranchProduct(db, firmId, branchId, product, groupMap[product.group_id] || null);
  }
}

export function deactivateFirmProduct(db, firmId, firmProductId) {
  db.prepare("UPDATE firm_products SET active = 0 WHERE id = ? AND firm_id = ?").run(firmProductId, firmId);
  db.prepare("UPDATE products SET active = 0 WHERE firm_product_id = ?").run(firmProductId);
}

export function removeFirmGroup(db, firmId, firmGroupId) {
  const used = db.prepare("SELECT id FROM firm_products WHERE firm_id = ? AND group_id = ?").get(firmId, firmGroupId);
  if (used) return { error: "Bu grupta ürün var. Önce ürünleri taşıyın veya silin." };
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
