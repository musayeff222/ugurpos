function localUid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const BRANCHED_TABLES = [
  "groups",
  "products",
  "customers",
  "staff",
  "firms",
  "payment_methods",
  "income_types",
  "expense_types",
  "income_entries",
  "expense_entries",
  "sales",
  "stock_counts",
  "purchase_invoices",
  "refund_requests",
  "tasks",
  "notices",
  "integrations",
  "variants",
  "sub_products",
  "e_invoices",
];

export function migrateBranches(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      firm_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT,
      address TEXT,
      phone TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_branches_firm ON branches(firm_id);
  `);

  const userCols = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
  if (!userCols.includes("role")) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'admin'");
  }
  if (!userCols.includes("branch_id")) {
    db.exec("ALTER TABLE users ADD COLUMN branch_id TEXT");
  }

  BRANCHED_TABLES.forEach((table) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    if (!cols.includes("branch_id")) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN branch_id TEXT`);
    }
  });

  const users = db.prepare("SELECT id, firm_id, firm_name, branch, branch_id FROM users").all();
  users.forEach((user) => {
    let branch = user.branch_id
      ? db.prepare("SELECT * FROM branches WHERE id = ?").get(user.branch_id)
      : null;

    if (!branch) {
      const existing = db
        .prepare("SELECT * FROM branches WHERE firm_id = ? AND name = ?")
        .get(user.firm_id, user.branch || "ANA HESAP");

      if (existing) {
        branch = existing;
      } else {
        const branchId = localUid("br");
        db.prepare(
          "INSERT INTO branches (id, firm_id, name, code, active) VALUES (?, ?, ?, ?, 1)"
        ).run(branchId, user.firm_id, user.branch || "ANA HESAP", "001");
        branch = db.prepare("SELECT * FROM branches WHERE id = ?").get(branchId);
      }

      db.prepare("UPDATE users SET branch_id = ?, role = COALESCE(role, 'admin') WHERE id = ?").run(
        branch.id,
        user.id
      );
    }

    BRANCHED_TABLES.forEach((table) => {
      db.prepare(`UPDATE ${table} SET branch_id = ? WHERE branch_id IS NULL`).run(branch.id);
    });
  });
}

export function ensureDefaultBranch(db, firmId, name = "ANA HESAP") {
  let branch = db.prepare("SELECT * FROM branches WHERE firm_id = ? AND name = ?").get(firmId, name);
  if (!branch) {
    const branchId = localUid("br");
    db.prepare(
      "INSERT INTO branches (id, firm_id, name, code, active) VALUES (?, ?, ?, ?, 1)"
    ).run(branchId, firmId, name, "001");
    branch = db.prepare("SELECT * FROM branches WHERE id = ?").get(branchId);
  }
  return branch;
}

export function rowToBranch(row) {
  if (!row) return null;
  return {
    id: row.id,
    firmId: row.firm_id,
    name: row.name,
    code: row.code || "",
    address: row.address || "",
    phone: row.phone || "",
    active: !!row.active,
    createdAt: row.created_at,
  };
}
