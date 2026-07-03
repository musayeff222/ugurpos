import { getBranchBusinessHours, getBusinessWindowForDate, isTimestampInWindow } from "./businessHours.js";
import { computeCashRegisterBalance } from "./cashRegister.js";
import { getSalePaymentParts } from "./salePayments.js";
import { uid } from "../db/index.js";
import { logActivity } from "./activityLog.js";

function sumSalesInWindow(db, branchId, window) {
  const sales = db
    .prepare("SELECT created_at, payment_type, total, cash_amount, pos_amount FROM sales WHERE branch_id = ?")
    .all(branchId);
  const inWindow = sales.filter((s) => isTimestampInWindow(s.created_at, window));
  const nonRefund = inWindow.filter((s) => s.payment_type !== "refund");
  const refunds = inWindow.filter((s) => s.payment_type === "refund");
  return {
    saleCount: nonRefund.length,
    totalSales: nonRefund.reduce((sum, s) => sum + Number(s.total || 0), 0),
    cashTotal: nonRefund.reduce((sum, s) => sum + getSalePaymentParts(s).cash, 0),
    posTotal: nonRefund.reduce((sum, s) => sum + getSalePaymentParts(s).pos, 0),
    openTotal: nonRefund.filter((s) => s.payment_type === "open").reduce((sum, s) => sum + Number(s.total || 0), 0),
    partialTotal: nonRefund.filter((s) => s.payment_type === "partial").reduce((sum, s) => sum + Number(s.total || 0), 0),
    refundTotal: refunds.reduce((sum, s) => sum + Math.abs(Number(s.total || 0)), 0),
  };
}

export function closeBusinessDayForBranch(db, branchId, businessDate, closedAtISO) {
  const existing = db
    .prepare("SELECT id FROM business_day_reports WHERE branch_id = ? AND business_date = ?")
    .get(branchId, businessDate);
  if (existing) return { skipped: true, id: existing.id };

  const branch = db.prepare("SELECT * FROM branches WHERE id = ?").get(branchId);
  if (!branch) return { skipped: true, reason: "branch_not_found" };

  const { openTime, closeTime } = getBranchBusinessHours(branch);
  const window = getBusinessWindowForDate(businessDate, openTime, closeTime);
  const cash = computeCashRegisterBalance(db, branchId, window, { ignoreClose: false });
  const sales = sumSalesInWindow(db, branchId, window);

  const stats = {
    ...sales,
    expenses: cash.expenses,
    withdrawals: cash.withdrawals,
    closingCash: cash.balance,
    cashSales: cash.cashSales,
  };

  const id = uid("bday");
  const now = closedAtISO || new Date().toISOString();
  db.prepare(
    `INSERT INTO business_day_reports
      (id, branch_id, business_date, open_time, close_time, opened_at, closed_at, opening_cash, closing_cash, stats_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    branchId,
    businessDate,
    openTime,
    closeTime,
    window.start,
    now,
    0,
    cash.balance,
    JSON.stringify(stats),
    now
  );

  logActivity(db, {
    firmId: branch.firm_id,
    branchId,
    branchName: branch.name,
    type: "business_day_close",
    title: `İş günü kapandı: ${businessDate}`,
    detail: `Kapanış nakit: ${cash.balance.toFixed(2)}`,
    refId: id,
  });

  return { id, stats, closingCash: cash.balance };
}
