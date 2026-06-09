import { ensureFirmSettings } from "../utils/qrMenu.js";
import { addColumnIfMissing } from "./columns.js";

export function migrateQrMenu(db) {
  if (db.dialect !== "mysql") {
    addColumnIfMissing(db, "branches", "menu_enabled", "INTEGER DEFAULT 1");
    addColumnIfMissing(db, "branches", "menu_title", "TEXT");
    addColumnIfMissing(db, "branches", "menu_welcome", "TEXT");
    addColumnIfMissing(db, "branches", "menu_accept_orders", "INTEGER DEFAULT 1");

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
  }

  const firms = db.prepare("SELECT DISTINCT firm_id, firm_name FROM users").all();
  firms.forEach((firm) => ensureFirmSettings(db, firm.firm_id, firm.firm_name));

  db.exec("UPDATE firm_settings SET menu_enabled = 1 WHERE menu_enabled = 0 OR menu_enabled IS NULL");
  db.exec("UPDATE branches SET menu_enabled = 1 WHERE active = 1 AND (menu_enabled = 0 OR menu_enabled IS NULL)");

  addColumnIfMissing(db, "firm_settings", "menu_social_instagram", db.dialect === "mysql" ? "VARCHAR(512)" : "TEXT");
  addColumnIfMissing(db, "firm_settings", "menu_social_whatsapp", db.dialect === "mysql" ? "VARCHAR(512)" : "TEXT");
  addColumnIfMissing(db, "firm_settings", "menu_social_tiktok", db.dialect === "mysql" ? "VARCHAR(512)" : "TEXT");
  addColumnIfMissing(db, "firm_settings", "menu_social_facebook", db.dialect === "mysql" ? "VARCHAR(512)" : "TEXT");
  addColumnIfMissing(db, "firm_settings", "menu_default_lang", db.dialect === "mysql" ? "VARCHAR(8) DEFAULT 'az'" : "TEXT DEFAULT 'az'");
  addColumnIfMissing(db, "firm_settings", "menu_logo_path", db.dialect === "mysql" ? "VARCHAR(512)" : "TEXT");
  addColumnIfMissing(db, "firm_settings", "menu_open_time", db.dialect === "mysql" ? "VARCHAR(8) DEFAULT '09:00'" : "TEXT DEFAULT '09:00'");
  addColumnIfMissing(db, "firm_settings", "menu_close_time", db.dialect === "mysql" ? "VARCHAR(8) DEFAULT '23:00'" : "TEXT DEFAULT '23:00'");
  addColumnIfMissing(db, "branches", "menu_lat", db.dialect === "mysql" ? "DOUBLE" : "REAL");
  addColumnIfMissing(db, "branches", "menu_lng", db.dialect === "mysql" ? "DOUBLE" : "REAL");
  addColumnIfMissing(db, "branches", "menu_open_time", db.dialect === "mysql" ? "VARCHAR(8)" : "TEXT");
  addColumnIfMissing(db, "branches", "menu_close_time", db.dialect === "mysql" ? "VARCHAR(8)" : "TEXT");
  addColumnIfMissing(
    db,
    "firm_settings",
    "menu_theme",
    db.dialect === "mysql" ? "VARCHAR(32) DEFAULT 'classic'" : "TEXT DEFAULT 'classic'"
  );
  addColumnIfMissing(db, "qr_orders", "device_id", db.dialect === "mysql" ? "VARCHAR(64)" : "TEXT");

  if (db.dialect !== "mysql") {
    db.exec("CREATE INDEX IF NOT EXISTS idx_qr_orders_device ON qr_orders(device_id)");
  }
}
