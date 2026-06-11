import { migrateBranches } from "./migrate-branches.js";
import { migrateQrMenu } from "./migrate-qr-menu.js";
import { migrateActivityLog } from "./migrate-activity-log.js";
import { initMysqlSchema } from "./schema-mysql.js";
import { hasColumn, addColumnIfMissing } from "./columns.js";

export function initSchema(db) {
  if (db.dialect === "mysql") {
    initMysqlSchema(db);
    migrateBranches(db);
    migrateQrMenu(db);
    migrateActivityLog(db);
    return;
  }

  initSqliteSchema(db);
}

function initSqliteSchema(db) {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      firm_id TEXT NOT NULL,
      firm_name TEXT NOT NULL,
      branch TEXT DEFAULT 'ANA HESAP',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      barcode TEXT NOT NULL,
      stock_code TEXT,
      name TEXT NOT NULL,
      group_id TEXT,
      stock REAL DEFAULT 0,
      critical_stock REAL DEFAULT 5,
      vat REAL DEFAULT 20,
      buy_price REAL DEFAULT 0,
      price1 REAL DEFAULT 0,
      price2 REAL DEFAULT 0,
      unit TEXT DEFAULT 'Adet',
      on_sale_page INTEGER DEFAULT 1,
      active INTEGER DEFAULT 1,
      FOREIGN KEY (group_id) REFERENCES groups(id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      note TEXT,
      credit_limit REAL DEFAULT 0,
      debt REAL DEFAULT 0,
      purchase_count INTEGER DEFAULT 0,
      last_payment_date TEXT
    );

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT,
      role TEXT,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS firms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      tax_no TEXT,
      balance REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS income_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expense_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS income_entries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      type_id TEXT,
      date TEXT NOT NULL,
      FOREIGN KEY (type_id) REFERENCES income_types(id)
    );

    CREATE TABLE IF NOT EXISTS expense_entries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      type_id TEXT,
      date TEXT NOT NULL,
      FOREIGN KEY (type_id) REFERENCES expense_types(id)
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      created_at TEXT NOT NULL,
      payment_type TEXT NOT NULL,
      customer_id TEXT,
      staff_name TEXT,
      note TEXT,
      discount REAL DEFAULT 0,
      discount_type TEXT DEFAULT 'TL',
      paid_amount REAL DEFAULT 0,
      total REAL NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT,
      name TEXT NOT NULL,
      qty REAL NOT NULL,
      price REAL NOT NULL,
      discount REAL DEFAULT 0,
      note TEXT,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stock_counts (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      previous_stock REAL NOT NULL,
      counted REAL NOT NULL,
      difference REAL NOT NULL,
      note TEXT,
      date TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_invoices (
      id TEXT PRIMARY KEY,
      invoice_no TEXT NOT NULL,
      firm_id TEXT,
      firm_name TEXT,
      total REAL NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (firm_id) REFERENCES firms(id)
    );

    CREATE TABLE IF NOT EXISTS refund_requests (
      id TEXT PRIMARY KEY,
      product_name TEXT,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      assignee TEXT,
      due_date TEXT
    );

    CREATE TABLE IF NOT EXISTS notices (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      read_flag INTEGER DEFAULT 0,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'inactive',
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS variants (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      name TEXT NOT NULL,
      sku TEXT,
      price REAL DEFAULT 0,
      stock REAL DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS sub_products (
      id TEXT PRIMARY KEY,
      parent_product_id TEXT,
      name TEXT NOT NULL,
      qty REAL DEFAULT 1,
      FOREIGN KEY (parent_product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS e_invoices (
      id TEXT PRIMARY KEY,
      direction TEXT NOT NULL,
      invoice_no TEXT,
      customer_name TEXT,
      total REAL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      date TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
  `);

  if (!hasColumn(db, "products", "unit")) {
    addColumnIfMissing(db, "products", "unit", "TEXT DEFAULT 'Adet'");
  }
  if (!hasColumn(db, "products", "image_path")) {
    addColumnIfMissing(db, "products", "image_path", "TEXT");
  }

  migrateBranches(db);
  migrateQrMenu(db);
  migrateActivityLog(db);
}
