import { sql as SQL } from "../db/dialect.js";
import { isTimestampInWindow } from "./businessHours.js";

export function sumCashSalesInWindow(db, branchId, window) {
  const sales = db
    .prepare(
      `SELECT created_at, payment_type, total FROM sales WHERE branch_id = ? AND payment_type != 'refund' ORDER BY created_at`
    )
    .all(branchId);
  return sales
    .filter((sale) => sale.payment_type === "cash" && isTimestampInWindow(sale.created_at, window))
    .reduce((sum, sale) => sum + Number(sale.total || 0), 0);
}

export function sumExpensesForBusinessDate(db, branchId, businessDate) {
  return Number(
    db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) as t FROM expense_entries WHERE branch_id = ? AND ${SQL.date("date")} = ?`
      )
      .get(branchId, businessDate)?.t || 0
  );
}

export function sumWithdrawalsInWindow(db, branchId, window) {
  const rows = db
    .prepare("SELECT amount, created_at FROM cash_withdrawals WHERE branch_id = ?")
    .all(branchId);
  return rows
    .filter((row) => isTimestampInWindow(row.created_at, window))
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

export function computeCashRegisterBalance(db, branchId, window) {
  const cashSales = sumCashSalesInWindow(db, branchId, window);
  const expenses = sumExpensesForBusinessDate(db, branchId, window.businessDate);
  const withdrawals = sumWithdrawalsInWindow(db, branchId, window);
  const balance = cashSales - expenses - withdrawals;
  return {
    cashSales,
    expenses,
    withdrawals,
    balance,
  };
}
