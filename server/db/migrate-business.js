import { addColumnIfMissing } from "./columns.js";

export function migrateBusiness(db) {
  addColumnIfMissing(db, "branches", "business_open_time", db.dialect === "mysql" ? "VARCHAR(8) DEFAULT '08:00'" : "TEXT DEFAULT '08:00'");
  addColumnIfMissing(db, "branches", "business_close_time", db.dialect === "mysql" ? "VARCHAR(8) DEFAULT '17:00'" : "TEXT DEFAULT '17:00'");
  addColumnIfMissing(db, "branches", "kind", db.dialect === "mysql" ? "VARCHAR(32) DEFAULT 'sales'" : "TEXT DEFAULT 'sales'");
  addColumnIfMissing(db, "staff", "can_cash_expense", db.dialect === "mysql" ? "TINYINT DEFAULT 0" : "INTEGER DEFAULT 0");
  addColumnIfMissing(db, "staff", "salary", db.dialect === "mysql" ? "DOUBLE DEFAULT 0" : "REAL DEFAULT 0");
  addColumnIfMissing(db, "staff", "phone", db.dialect === "mysql" ? "VARCHAR(64)" : "TEXT");
  addColumnIfMissing(db, "staff", "started_at", db.dialect === "mysql" ? "VARCHAR(32)" : "TEXT");
  addColumnIfMissing(db, "sales", "cash_amount", db.dialect === "mysql" ? "DOUBLE DEFAULT 0" : "REAL DEFAULT 0");
  addColumnIfMissing(db, "sales", "pos_amount", db.dialect === "mysql" ? "DOUBLE DEFAULT 0" : "REAL DEFAULT 0");
  addColumnIfMissing(db, "sales", "payment_method_id", db.dialect === "mysql" ? "VARCHAR(64)" : "TEXT");
  addColumnIfMissing(db, "sales", "payment_method_name", db.dialect === "mysql" ? "VARCHAR(255)" : "TEXT");

  if (db.dialect === "mysql") {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS firm_payment_methods (
          id VARCHAR(64) PRIMARY KEY,
          firm_id VARCHAR(64) NOT NULL,
          name VARCHAR(255) NOT NULL,
          active TINYINT(1) DEFAULT 1,
          sort_order INT DEFAULT 0,
          INDEX idx_firm_payment_methods_firm (firm_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    } catch {
      /* already exists */
    }
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS firm_payment_methods (
        id TEXT PRIMARY KEY,
        firm_id TEXT NOT NULL,
        name TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_firm_payment_methods_firm ON firm_payment_methods(firm_id);
    `);
  }

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

  if (db.dialect === "mysql") {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS raw_materials (
          id VARCHAR(64) PRIMARY KEY,
          branch_id VARCHAR(64) NOT NULL,
          name VARCHAR(255) NOT NULL,
          unit VARCHAR(32) DEFAULT 'kq',
          stock DOUBLE DEFAULT 0,
          note TEXT,
          created_at VARCHAR(40),
          INDEX idx_raw_materials_branch (branch_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS production_batches (
          id VARCHAR(64) PRIMARY KEY,
          branch_id VARCHAR(64) NOT NULL,
          product_name VARCHAR(255) NOT NULL,
          qty DOUBLE NOT NULL,
          unit VARCHAR(32) DEFAULT 'əd',
          note TEXT,
          created_at VARCHAR(40),
          INDEX idx_production_batches_branch (branch_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS production_batch_items (
          id VARCHAR(64) PRIMARY KEY,
          batch_id VARCHAR(64) NOT NULL,
          raw_material_id VARCHAR(64),
          raw_material_name VARCHAR(255),
          qty DOUBLE NOT NULL,
          INDEX idx_production_batch_items_batch (batch_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    } catch {
      /* already exists */
    }
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS raw_materials (
        id TEXT PRIMARY KEY,
        branch_id TEXT NOT NULL,
        name TEXT NOT NULL,
        unit TEXT DEFAULT 'kq',
        stock REAL DEFAULT 0,
        note TEXT,
        created_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_raw_materials_branch ON raw_materials(branch_id);
      CREATE TABLE IF NOT EXISTS production_batches (
        id TEXT PRIMARY KEY,
        branch_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        qty REAL NOT NULL,
        unit TEXT DEFAULT 'əd',
        note TEXT,
        created_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_production_batches_branch ON production_batches(branch_id);
      CREATE TABLE IF NOT EXISTS production_batch_items (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        raw_material_id TEXT,
        raw_material_name TEXT,
        qty REAL NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_production_batch_items_batch ON production_batch_items(batch_id);
    `);
  }

  addColumnIfMissing(db, "raw_materials", "critical_stock", db.dialect === "mysql" ? "DOUBLE DEFAULT 5" : "REAL DEFAULT 5");
  addColumnIfMissing(db, "production_batches", "product_id", db.dialect === "mysql" ? "VARCHAR(64)" : "TEXT");

  if (db.dialect === "mysql") {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS production_products (
          id VARCHAR(64) PRIMARY KEY,
          branch_id VARCHAR(64) NOT NULL,
          name VARCHAR(255) NOT NULL,
          created_at VARCHAR(40),
          INDEX idx_production_products_branch (branch_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS raw_material_movements (
          id VARCHAR(64) PRIMARY KEY,
          branch_id VARCHAR(64) NOT NULL,
          raw_material_id VARCHAR(64) NOT NULL,
          type VARCHAR(16) NOT NULL,
          qty DOUBLE NOT NULL,
          stock_after DOUBLE DEFAULT 0,
          note TEXT,
          batch_id VARCHAR(64),
          created_by VARCHAR(255),
          created_at VARCHAR(40),
          INDEX idx_raw_movements_material (raw_material_id),
          INDEX idx_raw_movements_branch (branch_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    } catch {
      /* already exists */
    }
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS production_products (
        id TEXT PRIMARY KEY,
        branch_id TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_production_products_branch ON production_products(branch_id);
      CREATE TABLE IF NOT EXISTS raw_material_movements (
        id TEXT PRIMARY KEY,
        branch_id TEXT NOT NULL,
        raw_material_id TEXT NOT NULL,
        type TEXT NOT NULL,
        qty REAL NOT NULL,
        stock_after REAL DEFAULT 0,
        note TEXT,
        batch_id TEXT,
        created_by TEXT,
        created_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_raw_movements_material ON raw_material_movements(raw_material_id);
      CREATE INDEX IF NOT EXISTS idx_raw_movements_branch ON raw_material_movements(branch_id);
    `);
  }

  addColumnIfMissing(
    db,
    "production_products",
    "ready_stock",
    db.dialect === "mysql" ? "DOUBLE DEFAULT 0" : "REAL DEFAULT 0"
  );

  if (db.dialect === "mysql") {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS branch_notifications (
          id VARCHAR(64) PRIMARY KEY,
          branch_id VARCHAR(64) NOT NULL,
          type VARCHAR(40) NOT NULL,
          title VARCHAR(255) NOT NULL,
          detail TEXT,
          created_at VARCHAR(40) NOT NULL,
          read_at VARCHAR(40),
          INDEX idx_branch_notifications_branch (branch_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS production_transfers (
          id VARCHAR(64) PRIMARY KEY,
          from_branch_id VARCHAR(64) NOT NULL,
          to_branch_id VARCHAR(64) NOT NULL,
          product_id VARCHAR(64),
          product_name VARCHAR(255) NOT NULL,
          qty_grams DOUBLE NOT NULL,
          created_by VARCHAR(255),
          created_at VARCHAR(40) NOT NULL,
          INDEX idx_production_transfers_from (from_branch_id),
          INDEX idx_production_transfers_to (to_branch_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    } catch {
      /* already exists */
    }
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS branch_notifications (
        id TEXT PRIMARY KEY,
        branch_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        detail TEXT,
        created_at TEXT NOT NULL,
        read_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_branch_notifications_branch ON branch_notifications(branch_id);
      CREATE TABLE IF NOT EXISTS production_transfers (
        id TEXT PRIMARY KEY,
        from_branch_id TEXT NOT NULL,
        to_branch_id TEXT NOT NULL,
        product_id TEXT,
        product_name TEXT NOT NULL,
        qty_grams REAL NOT NULL,
        created_by TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_production_transfers_from ON production_transfers(from_branch_id);
      CREATE INDEX IF NOT EXISTS idx_production_transfers_to ON production_transfers(to_branch_id);
    `);
  }

  addColumnIfMissing(
    db,
    "staff",
    "commission_percent",
    db.dialect === "mysql" ? "DOUBLE DEFAULT 0" : "REAL DEFAULT 0"
  );

  if (db.dialect === "mysql") {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS staff_shifts (
          id VARCHAR(64) PRIMARY KEY,
          staff_id VARCHAR(64) NOT NULL,
          branch_id VARCHAR(64) NOT NULL,
          staff_name VARCHAR(255),
          started_at VARCHAR(40) NOT NULL,
          ended_at VARCHAR(40),
          INDEX idx_staff_shifts_staff (staff_id),
          INDEX idx_staff_shifts_branch (branch_id),
          INDEX idx_staff_shifts_started (started_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    } catch {
      /* already exists */
    }
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS staff_shifts (
        id TEXT PRIMARY KEY,
        staff_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        staff_name TEXT,
        started_at TEXT NOT NULL,
        ended_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_staff_shifts_staff ON staff_shifts(staff_id);
      CREATE INDEX IF NOT EXISTS idx_staff_shifts_branch ON staff_shifts(branch_id);
      CREATE INDEX IF NOT EXISTS idx_staff_shifts_started ON staff_shifts(started_at);
    `);
  }
}
