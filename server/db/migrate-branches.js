import {
  DEFAULT_BRANCH_PASSWORD,
  hashBranchPassword,
} from "../utils/branchAuth.js";
import { hasColumn, addColumnIfMissing } from "./columns.js";

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

function defaultBranchEmail(db, branch) {
  const admin = db.prepare("SELECT email FROM users WHERE firm_id = ? LIMIT 1").get(branch.firm_id);
  const domain = admin?.email?.includes("@") ? admin.email.split("@")[1] : "benimpos.com";
  const num = branch.code ? String(parseInt(branch.code, 10) || branch.code) : "1";
  let candidate = `sube${num}@${domain}`;
  let i = 0;
  while (db.prepare("SELECT id FROM branches WHERE email = ? AND id != ?").get(candidate, branch.id)) {
    i += 1;
    candidate = `sube${num}${i}@${domain}`;
  }
  return candidate;
}

function ensureBranchCredentials(db, branch) {
  let next = branch;
  const updates = [];
  const values = [];

  if (!next.email) {
    updates.push("email = ?");
    values.push(defaultBranchEmail(db, next));
  }
  if (!next.password_hash) {
    updates.push("password_hash = ?");
    values.push(hashBranchPassword(DEFAULT_BRANCH_PASSWORD));
  }
  if (!next.code) {
    updates.push("code = ?");
    values.push("1");
  }

  if (updates.length) {
    values.push(next.id);
    db.prepare(`UPDATE branches SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    next = db.prepare("SELECT * FROM branches WHERE id = ?").get(next.id);
  }

  return next;
}

export function migrateBranches(db) {
  if (db.dialect !== "mysql") {
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

    addColumnIfMissing(db, "branches", "login_code", "TEXT");
    addColumnIfMissing(db, "branches", "password_hash", "TEXT");
    addColumnIfMissing(db, "branches", "email", "TEXT");
    addColumnIfMissing(db, "users", "role", "TEXT DEFAULT 'admin'");
    addColumnIfMissing(db, "users", "branch_id", "TEXT");

    BRANCHED_TABLES.forEach((table) => {
      addColumnIfMissing(db, table, "branch_id", "TEXT");
    });

    addColumnIfMissing(db, "staff", "surname", "TEXT");
    addColumnIfMissing(db, "staff", "login", "TEXT");
    addColumnIfMissing(db, "staff", "password_hash", "TEXT");

    try {
      db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_login_code ON branches(login_code)");
      db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_email ON branches(email)");
    } catch {
      /* index may exist */
    }
  } else {
    addColumnIfMissing(db, "staff", "surname", "VARCHAR(255)");
    addColumnIfMissing(db, "staff", "login", "VARCHAR(255)");
    addColumnIfMissing(db, "staff", "password_hash", "VARCHAR(255)");
  }

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
}

export function ensureDefaultBranch(db, firmId, name = "ANA HESAP") {
  let branch = db.prepare("SELECT * FROM branches WHERE firm_id = ? AND name = ?").get(firmId, name);
  if (!branch) {
    const branchId = localUid("br");
    const code = "1";
    const passwordHash = hashBranchPassword(DEFAULT_BRANCH_PASSWORD);
    db.prepare(
      "INSERT INTO branches (id, firm_id, name, code, password_hash, active) VALUES (?, ?, ?, ?, ?, 1)"
    ).run(branchId, firmId, name, code, passwordHash);
    branch = db.prepare("SELECT * FROM branches WHERE id = ?").get(branchId);
  } else {
    branch = ensureBranchCredentials(db, branch);
  }
  return branch;
}

export function rowToBranch(row) {
  if (!row) return null;
  const branchNo = row.code ? String(parseInt(row.code, 10) || row.code) : "";
  return {
    id: row.id,
    firmId: row.firm_id,
    name: row.name,
    branchNo,
    code: branchNo,
    email: row.email || "",
    loginCode: row.login_code || "",
    address: row.address || "",
    phone: row.phone || "",
    lat: row.menu_lat != null && row.menu_lat !== "" ? Number(row.menu_lat) : null,
    lng: row.menu_lng != null && row.menu_lng !== "" ? Number(row.menu_lng) : null,
    active: !!row.active,
    createdAt: row.created_at,
  };
}
