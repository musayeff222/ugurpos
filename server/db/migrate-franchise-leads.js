export function migrateFranchiseLeads(db) {
  if (db.dialect === "mysql") {
    db.exec(`
      CREATE TABLE IF NOT EXISTS franchise_applications (
        id VARCHAR(64) PRIMARY KEY,
        firm_id VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(64) NOT NULL,
        city VARCHAR(255) NOT NULL,
        budget VARCHAR(64) NOT NULL,
        experience VARCHAR(16) NOT NULL,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    return;
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS franchise_applications (
      id TEXT PRIMARY KEY,
      firm_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      city TEXT NOT NULL,
      budget TEXT NOT NULL,
      experience TEXT NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
}
