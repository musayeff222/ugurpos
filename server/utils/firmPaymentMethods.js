export function rowToFirmPaymentMethod(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    active: !!row.active,
    sort: Number(row.sort_order || 0),
    firmId: row.firm_id || null,
  };
}

export function listFirmPaymentMethods(db, firmId, { activeOnly = false } = {}) {
  if (!firmId) return [];
  let sql = "SELECT * FROM firm_payment_methods WHERE firm_id = ?";
  if (activeOnly) sql += " AND active = 1";
  sql += " ORDER BY sort_order, name";
  return db.prepare(sql).all(firmId).map(rowToFirmPaymentMethod);
}

export function getFirmIdForBranch(db, branchId) {
  const branch = db.prepare("SELECT firm_id FROM branches WHERE id = ?").get(branchId);
  return branch?.firm_id || null;
}

export function listFirmPaymentMethodsForBranch(db, branchId, opts = {}) {
  const firmId = getFirmIdForBranch(db, branchId);
  return listFirmPaymentMethods(db, firmId, opts);
}

export function findFirmPaymentMethodForBranch(db, branchId, methodId) {
  if (!methodId) return null;
  return db
    .prepare(
      `SELECT fpm.* FROM firm_payment_methods fpm
       JOIN branches b ON b.firm_id = fpm.firm_id
       WHERE fpm.id = ? AND b.id = ?`
    )
    .get(methodId, branchId);
}
