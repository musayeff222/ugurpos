import { addColumnIfMissing } from "./columns.js";

export function migrateBusiness(db) {
  addColumnIfMissing(db, "branches", "business_open_time", db.dialect === "mysql" ? "VARCHAR(8) DEFAULT '08:00'" : "TEXT DEFAULT '08:00'");
  addColumnIfMissing(db, "branches", "business_close_time", db.dialect === "mysql" ? "VARCHAR(8) DEFAULT '17:00'" : "TEXT DEFAULT '17:00'");
  addColumnIfMissing(db, "staff", "can_cash_expense", db.dialect === "mysql" ? "TINYINT DEFAULT 0" : "INTEGER DEFAULT 0");

  if (db.dialect === "mysql") {
    db.exec(`
      CREATE TABLE IF NOT EXISTS cash_withdrawals (
        id VARCHAR(64) PRIMARY KEY,
        branch_id VARCHAR(64) NOT NULL,
        staff_id VARCHAR(64),
        staff_name VARCHAR(255) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        reason VARCHAR(500) NOT NULL,
        note TEXT,
        created_at VARCHAR(32) NOT NULL,
        INDEX idx_cash_withdrawals_branch (branch_id),
        INDEX idx_cash_withdrawals_created (created_at)
      );
      CREATE TABLE IF NOT EXISTS business_day_reports (
        id VARCHAR(64) PRIMARY KEY,
        branch_id VARCHAR(64) NOT NULL,
        business_date VARCHAR(10) NOT NULL,
        open_time VARCHAR(8) NOT NULL,
        close_time VARCHAR(8) NOT NULL,
        opened_at VARCHAR(32) NOT NULL,
        closed_at VARCHAR(32) NOT NULL,
        opening_cash DECIMAL(12,2) DEFAULT 0,
        closing_cash DECIMAL(12,2) DEFAULT 0,
        stats_json TEXT NOT NULL,
        created_at VARCHAR(32) NOT NULL,
        UNIQUE KEY uniq_branch_business_day (branch_id, business_date),
        INDEX idx_business_day_branch (branch_id)
      );
    `);
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS cash_withdrawals (
        id TEXT PRIMARY KEY,
        branch_id TEXT NOT NULL,
        staff_id TEXT,
        staff_name TEXT NOT NULL,
        amount REAL NOT NULL,
        reason TEXT NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_cash_withdrawals_branch ON cash_withdrawals(branch_id);
      CREATE INDEX IF NOT EXISTS idx_cash_withdrawals_created ON cash_withdrawals(created_at);

      CREATE TABLE IF NOT EXISTS business_day_reports (
        id TEXT PRIMARY KEY,
        branch_id TEXT NOT NULL,
        business_date TEXT NOT NULL,
        open_time TEXT NOT NULL,
        close_time TEXT NOT NULL,
        opened_at TEXT NOT NULL,
        closed_at TEXT NOT NULL,
        opening_cash REAL DEFAULT 0,
        closing_cash REAL DEFAULT 0,
        stats_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(branch_id, business_date)
      );
      CREATE INDEX IF NOT EXISTS idx_business_day_branch ON business_day_reports(branch_id);
    `);
  }

  try {
    db.prepare(
      `UPDATE staff SET can_cash_expense = 1 WHERE LOWER(role) LIKE '%kasiyer%' AND (can_cash_expense IS NULL OR can_cash_expense = 0)`
    ).run();
  } catch {
    /* ignore */
  }
}
