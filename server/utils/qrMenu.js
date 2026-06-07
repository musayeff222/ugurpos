export function generateFirmMenuSlug(db, firmId) {
  const firmPart = String(firmId).replace(/\W/g, "").toLowerCase() || "firma";
  const slug = `menu-${firmPart}`;
  const taken = db
    .prepare("SELECT firm_id FROM firm_settings WHERE menu_slug = ? AND firm_id != ?")
    .get(slug, firmId);
  if (taken) {
    let i = 1;
    while (db.prepare("SELECT firm_id FROM firm_settings WHERE menu_slug = ?").get(`${slug}-${i}`)) i += 1;
    return `${slug}-${i}`;
  }
  return slug;
}

export function ensureFirmSettings(db, firmId, firmName = "Firma") {
  let row = db.prepare("SELECT * FROM firm_settings WHERE firm_id = ?").get(firmId);
  if (!row) {
    const slug = generateFirmMenuSlug(db, firmId);
    db.prepare(
      "INSERT INTO firm_settings (firm_id, menu_slug, menu_title, menu_welcome, menu_enabled) VALUES (?, ?, ?, '', 1)"
    ).run(firmId, slug, firmName);
    row = db.prepare("SELECT * FROM firm_settings WHERE firm_id = ?").get(firmId);
  } else {
    if (!row.menu_slug) {
      const slug = generateFirmMenuSlug(db, firmId);
      db.prepare("UPDATE firm_settings SET menu_slug = ? WHERE firm_id = ?").run(slug, firmId);
    }
    row = db.prepare("SELECT * FROM firm_settings WHERE firm_id = ?").get(firmId);
  }
  return row;
}

export function resolveFirmByMenuSlug(db, slug) {
  const normalized = String(slug || "").trim().toLowerCase();
  if (!normalized) return null;
  return db
    .prepare("SELECT * FROM firm_settings WHERE LOWER(menu_slug) = ?")
    .get(normalized);
}

export function getFirmByMenuSlug(db, slug) {
  const row = resolveFirmByMenuSlug(db, slug);
  if (!row) return null;
  if (!row.menu_enabled) return null;
  return row;
}

export function rowToFirmMenu(row, firmName = "") {
  if (!row) return null;
  return {
    firmId: row.firm_id,
    menuSlug: row.menu_slug,
    menuTitle: row.menu_title || firmName || "Menü",
    menuWelcome: row.menu_welcome || "",
    menuEnabled: !!row.menu_enabled,
  };
}

export function rowToMenuBranch(row) {
  if (!row) return null;
  const branchNo = row.code ? String(parseInt(row.code, 10) || row.code) : "";
  return {
    id: row.id,
    firmId: row.firm_id,
    name: row.name,
    branchNo,
    address: row.address || "",
    phone: row.phone || "",
    active: !!row.active,
    menuEnabled: !!row.menu_enabled,
    menuTitle: row.menu_title || row.name,
    menuWelcome: row.menu_welcome || "",
    menuAcceptOrders: row.menu_accept_orders !== 0,
  };
}

export function rowToQrOrder(row, items = []) {
  if (!row) return null;
  return {
    id: row.id,
    branchId: row.branch_id,
    branchName: row.branch_name || "",
    branchNo: row.branch_no || "",
    firmName: row.firm_name || "",
    code: row.code,
    status: row.status,
    customerName: row.customer_name || "",
    customerPhone: row.customer_phone || "",
    tableNo: row.table_no || "",
    note: row.note || "",
    total: row.total,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  };
}

export function getBranchForFirmMenu(db, firmId, branchId) {
  return db
    .prepare(
      "SELECT * FROM branches WHERE id = ? AND firm_id = ? AND active = 1 AND menu_enabled = 1"
    )
    .get(branchId, firmId);
}
