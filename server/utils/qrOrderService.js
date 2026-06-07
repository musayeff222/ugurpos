import { rowToQrOrder } from "./qrMenu.js";

export function loadQrOrderItems(db, orderId) {
  return db.prepare("SELECT * FROM qr_order_items WHERE order_id = ?").all(orderId).map((item) => ({
    id: item.id,
    productId: item.product_id,
    name: item.name,
    qty: item.qty,
    price: item.price,
    note: item.note || "",
  }));
}

export function loadQrOrder(db, orderId, branchId = null) {
  let sql = `
    SELECT o.*, b.name as branch_name, b.code as branch_code,
      (SELECT firm_name FROM users WHERE firm_id = b.firm_id LIMIT 1) as firm_name
    FROM qr_orders o
    JOIN branches b ON b.id = o.branch_id
    WHERE o.id = ?
  `;
  const params = [orderId];
  if (branchId) {
    sql += " AND o.branch_id = ?";
    params.push(branchId);
  }
  const order = db.prepare(sql).get(...params);
  if (!order) return null;
  const branchNo = order.branch_code ? String(parseInt(order.branch_code, 10) || order.branch_code) : "";
  return rowToQrOrder({ ...order, branch_no: branchNo }, loadQrOrderItems(db, orderId));
}

export function listQrOrders(db, { firmId, branchId, status, limit = 50 }) {
  let sql = `
    SELECT o.*, b.name as branch_name, b.code as branch_code, b.firm_id,
      (SELECT firm_name FROM users WHERE firm_id = b.firm_id LIMIT 1) as firm_name
    FROM qr_orders o
    JOIN branches b ON b.id = o.branch_id
    WHERE 1=1
  `;
  const params = [];

  if (branchId) {
    sql += " AND o.branch_id = ?";
    params.push(branchId);
  } else if (firmId) {
    sql += " AND b.firm_id = ?";
    params.push(firmId);
  }

  if (status && status !== "all") {
    sql += " AND o.status = ?";
    params.push(status);
  }

  sql += " ORDER BY o.created_at DESC LIMIT ?";
  params.push(limit);

  return db.prepare(sql).all(...params).map((order) => {
    const branchNo = order.branch_code ? String(parseInt(order.branch_code, 10) || order.branch_code) : "";
    return rowToQrOrder({ ...order, branch_no: branchNo }, loadQrOrderItems(db, order.id));
  });
}

const ALLOWED_STATUS = new Set(["pending", "accepted", "rejected", "completed"]);

export function updateQrOrderStatus(db, orderId, status, branchId = null) {
  if (!ALLOWED_STATUS.has(status)) {
    throw new Error("Geçersiz sipariş durumu");
  }

  const existing = branchId
    ? db.prepare("SELECT * FROM qr_orders WHERE id = ? AND branch_id = ?").get(orderId, branchId)
    : db.prepare("SELECT * FROM qr_orders WHERE id = ?").get(orderId);

  if (!existing) return null;

  if (status === "accepted" && existing.status === "pending") {
    const items = db.prepare("SELECT * FROM qr_order_items WHERE order_id = ?").all(orderId);
    const updStock = db.prepare(
      "UPDATE products SET stock = CASE WHEN stock - ? < 0 THEN 0 ELSE stock - ? END WHERE id = ? AND branch_id = ?"
    );
    items.forEach((item) => {
      if (item.product_id) updStock.run(item.qty, item.qty, item.product_id, existing.branch_id);
    });
  }

  if (status === "rejected" && existing.status === "accepted") {
    const items = db.prepare("SELECT * FROM qr_order_items WHERE order_id = ?").all(orderId);
    const updStock = db.prepare("UPDATE products SET stock = stock + ? WHERE id = ? AND branch_id = ?");
    items.forEach((item) => {
      if (item.product_id) updStock.run(item.qty, item.product_id, existing.branch_id);
    });
  }

  db.prepare("UPDATE qr_orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, orderId);
  return loadQrOrder(db, orderId, branchId || undefined);
}
