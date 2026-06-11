export function migrateActivityLog(db) {
  if (db.dialect === "mysql") {
    db.exec(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR(64) PRIMARY KEY,
        firm_id VARCHAR(64) NOT NULL,
        branch_id VARCHAR(64),
        branch_name VARCHAR(255),
        type VARCHAR(32) NOT NULL,
        title VARCHAR(512) NOT NULL,
        detail TEXT,
        ref_id VARCHAR(64),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_activity_logs_firm (firm_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    return;
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      firm_id TEXT NOT NULL,
      branch_id TEXT,
      branch_name TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT,
      ref_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_activity_logs_firm ON activity_logs(firm_id, created_at);
  `);
}
