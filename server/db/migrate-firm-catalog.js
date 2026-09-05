import { addColumnIfMissing } from "./columns.js";

function tryExec(db, sql) {
  try {
    db.exec(sql);
  } catch {
    /* already exists */
  }
}

export function migrateFirmCatalog(db) {
  const mysql = db.dialect === "mysql";

  if (mysql) {
    tryExec(
      db,
      `CREATE TABLE IF NOT EXISTS firm_groups (
        id VARCHAR(64) PRIMARY KEY,
        firm_id VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        INDEX idx_firm_groups_firm (firm_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    tryExec(
      db,
      `CREATE TABLE IF NOT EXISTS firm_products (
        id VARCHAR(64) PRIMARY KEY,
        firm_id VARCHAR(64) NOT NULL,
        group_id VARCHAR(64),
        barcode VARCHAR(64) NOT NULL,
        stock_code VARCHAR(64),
        name VARCHAR(255) NOT NULL,
        vat DOUBLE DEFAULT 20,
        buy_price DOUBLE DEFAULT 0,
        price1 DOUBLE DEFAULT 0,
        price2 DOUBLE DEFAULT 0,
        unit VARCHAR(32) DEFAULT 'Adet',
        on_sale_page TINYINT(1) DEFAULT 1,
        active TINYINT(1) DEFAULT 1,
        image_path VARCHAR(512),
        INDEX idx_firm_products_firm (firm_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    addColumnIfMissing(db, "groups", "firm_group_id", "VARCHAR(64)");
    addColumnIfMissing(db, "products", "firm_product_id", "VARCHAR(64)");
    tryExec(db, "CREATE INDEX idx_products_firm_product ON products (firm_product_id)");
    tryExec(db, "CREATE INDEX idx_groups_firm_group ON `groups` (firm_group_id)");
    return;
  }

  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS firm_groups (
      id TEXT PRIMARY KEY,
      firm_id TEXT NOT NULL,
      name TEXT NOT NULL
    )`
  );
  tryExec(
    db,
    `CREATE TABLE IF NOT EXISTS firm_products (
      id TEXT PRIMARY KEY,
      firm_id TEXT NOT NULL,
      group_id TEXT,
      barcode TEXT NOT NULL,
      stock_code TEXT,
      name TEXT NOT NULL,
      vat REAL DEFAULT 20,
      buy_price REAL DEFAULT 0,
      price1 REAL DEFAULT 0,
      price2 REAL DEFAULT 0,
      unit TEXT DEFAULT 'Adet',
      on_sale_page INTEGER DEFAULT 1,
      active INTEGER DEFAULT 1,
      image_path TEXT
    )`
  );
  addColumnIfMissing(db, "groups", "firm_group_id", "TEXT");
  addColumnIfMissing(db, "products", "firm_product_id", "TEXT");
  tryExec(db, "CREATE INDEX IF NOT EXISTS idx_firm_groups_firm ON firm_groups (firm_id)");
  tryExec(db, "CREATE INDEX IF NOT EXISTS idx_firm_products_firm ON firm_products (firm_id)");
  tryExec(db, "CREATE INDEX IF NOT EXISTS idx_products_firm_product ON products (firm_product_id)");
  tryExec(db, "CREATE INDEX IF NOT EXISTS idx_groups_firm_group ON `groups` (firm_group_id)");
}
