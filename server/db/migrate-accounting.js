import { addColumnIfMissing } from "./columns.js";

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
  const tableTail = mysql ? " ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci" : "";

  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS account_kassas (
      id ${id} PRIMARY KEY,
      firm_id ${id} NOT NULL,
      name ${text} NOT NULL,
      kind ${text} NOT NULL,
      created_at ${stamp}
    )${tableTail}`
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
    )${tableTail}`
  );
  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS account_buy_prices (
      firm_id ${id} NOT NULL,
      wholesaler_id ${id} NOT NULL,
      firm_product_id ${id} NOT NULL,
      buy_price ${money} NOT NULL DEFAULT 0,
      PRIMARY KEY (firm_id, wholesaler_id, firm_product_id)
    )${tableTail}`
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
    )${tableTail}`
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
    )${tableTail}`
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
    )${tableTail}`
  );
  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS account_firm_days (
      firm_id ${id} PRIMARY KEY,
      business_date ${text} NOT NULL,
      opened_at ${text} NOT NULL
    )${tableTail}`
  );
  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS account_day_closes (
      id ${id} PRIMARY KEY,
      firm_id ${id} NOT NULL,
      branch_id ${id} NOT NULL,
      business_date ${text} NOT NULL,
      amount ${money} NOT NULL DEFAULT 0,
      kassa_id ${id},
      closed_at ${text} NOT NULL
    )${tableTail}`
  );
  tryExec(db, "CREATE UNIQUE INDEX idx_account_day_branch ON account_day_closes (branch_id, business_date)");
  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS account_branch_pulls (
      id ${id} PRIMARY KEY,
      firm_id ${id} NOT NULL,
      branch_id ${id} NOT NULL,
      kassa_id ${id} NOT NULL,
      amount ${money} NOT NULL DEFAULT 0,
      kind ${text} NOT NULL DEFAULT 'nakit',
      note ${longText},
      created_at ${stamp}
    )${tableTail}`
  );
  addColumnIfMissing(db, "account_branch_pulls", "kind", mysql ? "VARCHAR(32) DEFAULT 'nakit'" : "TEXT DEFAULT 'nakit'");
  if (mysql) alignAccountCollation(db);
}

const ACCOUNT_TABLES = [
  "account_kassas",
  "account_wholesalers",
  "account_buy_prices",
  "account_purchases",
  "account_purchase_lines",
  "account_movements",
  "account_firm_days",
  "account_day_closes",
  "account_branch_pulls",
];

function alignAccountCollation(db) {
  for (const table of ACCOUNT_TABLES) {
    try {
      const row = db
        .prepare(
          "SELECT TABLE_COLLATION AS collation FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?"
        )
        .get(table);
      if (!row?.collation || String(row.collation).toLowerCase() === "utf8mb4_unicode_ci") continue;
      db.exec(`ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    } catch {
      /* comparison in queries still forces one collation */
    }
  }
}
