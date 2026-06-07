import {
  DEFAULT_BRANCH_PASSWORD,
  generateBranchLoginCode,
  hashBranchPassword,
} from "../utils/branchAuth.js";

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

function ensureBranchCredentials(db, branch) {
  if (branch.login_code && branch.password_hash) return branch;
  const loginCode = generateBranchLoginCode(db, branch.firm_id, branch.name, branch.code);
  const passwordHash = hashBranchPassword(DEFAULT_BRANCH_PASSWORD);
  db.prepare("UPDATE branches SET login_code = ?, password_hash = ? WHERE id = ?").run(
    loginCode,
    passwordHash,
    branch.id
  );
  return db.prepare("SELECT * FROM branches WHERE id = ?").get(branch.id);
}

export function migrateBranches(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      firm_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT,
      login_code TEXT,
      password_hash TEXT,
      address TEXT,
      phone TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_branches_firm ON branches(firm_id);
  `);

  const branchCols = db.prepare("PRAGMA table_info(branches)").all().map((c) => c.name);
  if (!branchCols.includes("login_code")) {
    db.exec("ALTER TABLE branches ADD COLUMN login_code TEXT");
  }
  if (!branchCols.includes("password_hash")) {
    db.exec("ALTER TABLE branches ADD COLUMN password_hash TEXT");
  }

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
        branch = ensureDefaultBranch(db, user.firm_id, user.branch || "ANA HESAP");
      }

      db.prepare("UPDATE users SET branch_id = ?, role = COALESCE(role, 'admin') WHERE id = ?").run(
        branch.id,
        user.id
      );
    }

    ensureBranchCredentials(db, branch);

    BRANCHED_TABLES.forEach((table) => {
      db.prepare(`UPDATE ${table} SET branch_id = ? WHERE branch_id IS NULL`).run(branch.id);
    });
  });

  db.prepare("SELECT * FROM branches").all().forEach((branch) => ensureBranchCredentials(db, branch));
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_login_code ON branches(login_code)");
}

export function ensureDefaultBranch(db, firmId, name = "ANA HESAP") {
  let branch = db.prepare("SELECT * FROM branches WHERE firm_id = ? AND name = ?").get(firmId, name);
  if (!branch) {
    const branchId = localUid("br");
    const code = "001";
    const loginCode = generateBranchLoginCode(db, firmId, name, code);
    const passwordHash = hashBranchPassword(DEFAULT_BRANCH_PASSWORD);
    db.prepare(
      "INSERT INTO branches (id, firm_id, name, code, login_code, password_hash, active) VALUES (?, ?, ?, ?, ?, ?, 1)"
    ).run(branchId, firmId, name, code, loginCode, passwordHash);
    branch = db.prepare("SELECT * FROM branches WHERE id = ?").get(branchId);
  } else {
    branch = ensureBranchCredentials(db, branch);
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
    loginCode: row.login_code || "",
    address: row.address || "",
    phone: row.phone || "",
    active: !!row.active,
    createdAt: row.created_at,
  };
}
