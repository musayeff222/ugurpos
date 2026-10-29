import { addColumnIfMissing } from "./columns.js";

function tryExec(db, sql) {
  try {
    db.exec(sql);
  } catch {
    /* already exists */
  }
}

export const ELEMAN_CATALOG = [
  { name: "Sos qabı", unit: "adet" },
  { name: "Salat qabı", unit: "adet" },
  { name: "Nar şərab", unit: "adet" },
  { name: "Acı sos", unit: "adet" },
  { name: "Çiğköfte", unit: "kq" },
  { name: "Pinqivin", unit: "kq" },
  { name: "Poşet", unit: "adet" },
  { name: "Dürüm kağıdı", unit: "adet" },
  { name: "500 qramlıq pors qabı", unit: "adet" },
  { name: "250 qramlıq pors qabı", unit: "adet" },
];

export function migrateEleman(db) {
  const mysql = db.dialect === "mysql";
  const id = mysql ? "VARCHAR(64)" : "TEXT";
  const text = mysql ? "VARCHAR(255)" : "TEXT";
  const longText = mysql ? "TEXT" : "TEXT";
  const money = mysql ? "DECIMAL(12,2)" : "REAL";
  const qty = mysql ? "DECIMAL(12,3)" : "REAL";
  const stamp = mysql ? "DATETIME DEFAULT CURRENT_TIMESTAMP" : "TEXT DEFAULT (datetime('now'))";
  const flag = mysql ? "TINYINT(1)" : "INTEGER";
  const tableTail = mysql ? " ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci" : "";

  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS eleman_products (
      id ${id} PRIMARY KEY,
      firm_id ${id} NOT NULL,
      name ${text} NOT NULL,
      unit ${text} NOT NULL DEFAULT 'adet',
      price ${money} NOT NULL DEFAULT 0,
      sort_no ${mysql ? "INT" : "INTEGER"} NOT NULL DEFAULT 0,
      active ${flag} NOT NULL DEFAULT 1
    )${tableTail}`
  );
  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS eleman_people (
      id ${id} PRIMARY KEY,
      firm_id ${id} NOT NULL,
      first_name ${text} NOT NULL,
      last_name ${text} NOT NULL,
      phone ${text},
      login ${text} NOT NULL,
      password_hash ${text} NOT NULL,
      blocked ${flag} NOT NULL DEFAULT 0,
      created_at ${stamp}
    )${tableTail}`
  );
  tryExec(db, "CREATE UNIQUE INDEX idx_eleman_login_firm ON eleman_people (firm_id, login)");
  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS eleman_cash (
      id ${id} PRIMARY KEY,
      firm_id ${id} NOT NULL,
      eleman_id ${id} NOT NULL,
      direction ${text} NOT NULL,
      amount ${money} NOT NULL DEFAULT 0,
      kind ${text} NOT NULL,
      ref_id ${id},
      note ${longText},
      created_at ${stamp}
    )${tableTail}`
  );
  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS eleman_stock (
      firm_id ${id} NOT NULL,
      eleman_id ${id} NOT NULL,
      product_id ${id} NOT NULL,
      unit ${text} NOT NULL,
      qty ${qty} NOT NULL DEFAULT 0,
      unit_cost ${money} NOT NULL DEFAULT 0,
      PRIMARY KEY (eleman_id, product_id, unit)
    )${tableTail}`
  );
  addColumnIfMissing(db, "eleman_stock", "unit_cost", `${money} NOT NULL DEFAULT 0`);
  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS eleman_purchases (
      id ${id} PRIMARY KEY,
      firm_id ${id} NOT NULL,
      eleman_id ${id} NOT NULL,
      total ${money} NOT NULL DEFAULT 0,
      invoice_url ${text},
      created_at ${stamp}
    )${tableTail}`
  );
  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS eleman_purchase_lines (
      id ${id} PRIMARY KEY,
      purchase_id ${id} NOT NULL,
      product_id ${id},
      name ${text} NOT NULL,
      qty ${qty} NOT NULL DEFAULT 0,
      unit ${text} NOT NULL,
      price ${money} NOT NULL DEFAULT 0
    )${tableTail}`
  );
  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS eleman_deliveries (
      id ${id} PRIMARY KEY,
      firm_id ${id} NOT NULL,
      eleman_id ${id} NOT NULL,
      branch_id ${id} NOT NULL,
      staff_id ${id} NOT NULL,
      total ${money} NOT NULL DEFAULT 0,
      status ${text} NOT NULL DEFAULT 'pending',
      created_at ${stamp},
      accepted_at ${text}
    )${tableTail}`
  );
  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS eleman_delivery_lines (
      id ${id} PRIMARY KEY,
      delivery_id ${id} NOT NULL,
      product_id ${id},
      name ${text} NOT NULL,
      qty ${qty} NOT NULL DEFAULT 0,
      unit ${text} NOT NULL,
      price ${money} NOT NULL DEFAULT 0
    )${tableTail}`
  );

  try {
    const rows = db
      .prepare(
        `SELECT p.eleman_id AS elemanId, l.product_id AS productId, l.unit AS unit,
                SUM(l.qty * l.price) AS amount, SUM(l.qty) AS qty
         FROM eleman_purchase_lines l
         INNER JOIN eleman_purchases p ON p.id = l.purchase_id
         GROUP BY p.eleman_id, l.product_id, l.unit`
      )
      .all();
    const update = db.prepare(
      "UPDATE eleman_stock SET unit_cost = ? WHERE eleman_id = ? AND product_id = ? AND unit = ? AND (unit_cost IS NULL OR unit_cost = 0)"
    );
    for (const row of rows) {
      const qtySum = Number(row.qty);
      if (!qtySum) continue;
      const cost = Math.round((Number(row.amount) / qtySum) * 100) / 100;
      update.run(cost, row.elemanId, row.productId, row.unit);
    }
  } catch {
    /* no purchase history yet */
  }
}
