import { ensureFirmSettings } from "../utils/qrMenu.js";

export function migrateQrMenu(db) {
  const branchCols = db.prepare("PRAGMA table_info(branches)").all().map((c) => c.name);
  if (!branchCols.includes("menu_enabled")) {
    db.exec("ALTER TABLE branches ADD COLUMN menu_enabled INTEGER DEFAULT 1");
  }
  if (!branchCols.includes("menu_title")) {
    db.exec("ALTER TABLE branches ADD COLUMN menu_title TEXT");
  }
  if (!branchCols.includes("menu_welcome")) {
    db.exec("ALTER TABLE branches ADD COLUMN menu_welcome TEXT");
  }
  if (!branchCols.includes("menu_accept_orders")) {
    db.exec("ALTER TABLE branches ADD COLUMN menu_accept_orders INTEGER DEFAULT 1");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS firm_settings (
      firm_id TEXT PRIMARY KEY,
      menu_slug TEXT UNIQUE,
      menu_title TEXT,
      menu_welcome TEXT,
      menu_enabled INTEGER DEFAULT 1
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_firm_settings_menu_slug ON firm_settings(menu_slug);

    CREATE TABLE IF NOT EXISTS qr_orders (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL,
      code TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      customer_name TEXT,
      customer_phone TEXT,
      table_no TEXT,
      note TEXT,
      total REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_qr_orders_branch ON qr_orders(branch_id);
    CREATE INDEX IF NOT EXISTS idx_qr_orders_status ON qr_orders(status);
    CREATE TABLE IF NOT EXISTS qr_order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT,
      name TEXT NOT NULL,
      qty REAL NOT NULL,
      price REAL NOT NULL,
      note TEXT,
      FOREIGN KEY (order_id) REFERENCES qr_orders(id)
    );
    CREATE INDEX IF NOT EXISTS idx_qr_order_items_order ON qr_order_items(order_id);
  `);

  const firms = db.prepare("SELECT DISTINCT firm_id, firm_name FROM users").all();
  firms.forEach((firm) => ensureFirmSettings(db, firm.firm_id, firm.firm_name));

  db.exec("UPDATE firm_settings SET menu_enabled = 1 WHERE menu_enabled = 0 OR menu_enabled IS NULL");
  db.exec("UPDATE branches SET menu_enabled = 1 WHERE active = 1 AND (menu_enabled = 0 OR menu_enabled IS NULL)");
}
