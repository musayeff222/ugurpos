function tryExec(db, sql) {
  try {
    db.exec(sql);
  } catch {
    /* already exists */
  }
}

export function migrateAccounting(db) {
  const mysql = db.dialect === "mysql";
  const id = mysql ? "VARCHAR(64)" : "TEXT";
  const text = mysql ? "VARCHAR(255)" : "TEXT";
  const longText = mysql ? "TEXT" : "TEXT";
  const money = mysql ? "DECIMAL(12,2)" : "REAL";
  const qty = mysql ? "DECIMAL(12,3)" : "REAL";
  const stamp = mysql ? "DATETIME DEFAULT CURRENT_TIMESTAMP" : "TEXT DEFAULT (datetime('now'))";

  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS account_kassas (
      id ${id} PRIMARY KEY,
      firm_id ${id} NOT NULL,
      name ${text} NOT NULL,
      kind ${text} NOT NULL,
      created_at ${stamp}
    )`
  );
  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS account_wholesalers (
      id ${id} PRIMARY KEY,
      firm_id ${id} NOT NULL,
      name ${text} NOT NULL,
      phone ${text},
      note ${longText},
      created_at ${stamp}
    )`
  );
  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS account_buy_prices (
      firm_id ${id} NOT NULL,
      wholesaler_id ${id} NOT NULL,
      firm_product_id ${id} NOT NULL,
      buy_price ${money} NOT NULL DEFAULT 0,
      PRIMARY KEY (firm_id, wholesaler_id, firm_product_id)
    )`
  );
  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS account_purchases (
      id ${id} PRIMARY KEY,
      firm_id ${id} NOT NULL,
      wholesaler_id ${id} NOT NULL,
      payment_type ${text} NOT NULL,
      kassa_id ${id},
      total ${money} NOT NULL DEFAULT 0,
      note ${longText},
      created_at ${stamp}
    )`
  );
  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS account_purchase_lines (
      id ${id} PRIMARY KEY,
      purchase_id ${id} NOT NULL,
      firm_product_id ${id},
      name ${text} NOT NULL,
      qty ${qty} NOT NULL DEFAULT 0,
      buy_price ${money} NOT NULL DEFAULT 0
    )`
  );
  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS account_movements (
      id ${id} PRIMARY KEY,
      firm_id ${id} NOT NULL,
      kassa_id ${id} NOT NULL,
      direction ${text} NOT NULL,
      amount ${money} NOT NULL DEFAULT 0,
      kind ${text} NOT NULL,
      ref_id ${id},
      note ${longText},
      created_at ${stamp}
    )`
  );
  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS account_branch_pulls (
      id ${id} PRIMARY KEY,
      firm_id ${id} NOT NULL,
      branch_id ${id} NOT NULL,
      kassa_id ${id} NOT NULL,
      amount ${money} NOT NULL DEFAULT 0,
      note ${longText},
      created_at ${stamp}
    )`
  );
}
