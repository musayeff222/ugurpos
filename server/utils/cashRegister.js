import { sql as SQL } from "../db/dialect.js";
import { isTimestampInWindow } from "./businessHours.js";
import { getSalePaymentParts } from "./salePayments.js";

export function sumCashSalesInWindow(db, branchId, window, options = {}) {
  const sales = db
    .prepare(
      `SELECT created_at, payment_type, total, cash_amount, pos_amount FROM sales WHERE branch_id = ? AND payment_type != 'refund' ORDER BY created_at`
    )
    .all(branchId);
  return sales
    .filter((sale) => isTimestampInWindow(sale.created_at, window, options))
    .reduce((sum, sale) => sum + getSalePaymentParts(sale).cash, 0);
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

export function sumWithdrawalsInWindow(db, branchId, window, options = {}) {
  const rows = db
    .prepare("SELECT amount, created_at FROM cash_withdrawals WHERE branch_id = ?")
    .all(branchId);
  return rows
    .filter((row) => isTimestampInWindow(row.created_at, window, options))
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

export function computeCashRegisterBalance(db, branchId, window, options = {}) {
  const windowOptions = { ignoreClose: options.ignoreClose ?? true };
  const cashSales = sumCashSalesInWindow(db, branchId, window, windowOptions);
  const expenses = sumExpensesForBusinessDate(db, branchId, window.businessDate);
  const withdrawals = sumWithdrawalsInWindow(db, branchId, window, windowOptions);
  const balance = cashSales - expenses - withdrawals;
  return {
    cashSales,
    expenses,
    withdrawals,
    balance,
  };
}
