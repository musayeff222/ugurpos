import { addColumnIfMissing } from "./columns.js";

function tryExec(db, sql) {
  try {
    db.exec(sql);
  } catch {
    /* index already exists or dialect nuance */
  }
}

export function migrateOfflineSync(db) {
  const mysql = db.dialect === "mysql";
  addColumnIfMissing(db, "sales", "client_sale_id", mysql ? "VARCHAR(80)" : "TEXT");
  addColumnIfMissing(db, "cash_withdrawals", "client_id", mysql ? "VARCHAR(80)" : "TEXT");
  addColumnIfMissing(db, "expense_entries", "client_id", mysql ? "VARCHAR(80)" : "TEXT");

  if (mysql) {
    tryExec(db, "CREATE UNIQUE INDEX idx_sales_branch_client ON sales (branch_id, client_sale_id)");
    tryExec(db, "CREATE UNIQUE INDEX idx_cash_withdrawals_branch_client ON cash_withdrawals (branch_id, client_id)");
    tryExec(db, "CREATE UNIQUE INDEX idx_expense_branch_client ON expense_entries (branch_id, client_id)");
  } else {
    tryExec(
      db,
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_branch_client ON sales (branch_id, client_sale_id) WHERE client_sale_id IS NOT NULL"
    );
    tryExec(
      db,
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_withdrawals_branch_client ON cash_withdrawals (branch_id, client_id) WHERE client_id IS NOT NULL"
    );
    tryExec(
      db,
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_branch_client ON expense_entries (branch_id, client_id) WHERE client_id IS NOT NULL"
    );
  }
}
