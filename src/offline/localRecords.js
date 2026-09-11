import { resolvePaymentAmounts } from "../utils/salePayments";

function saleCode() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `OFF${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export function buildLocalSale(payload, clientSaleId) {
  const items = payload.items || [];
  let subtotal = items.reduce((sum, item) => sum + item.qty * item.price - (item.discount || 0), 0);
  const disc = Number(payload.discount) || 0;
  if (payload.discountType === "Yüzde") subtotal = Math.max(0, subtotal - (subtotal * disc) / 100);
  else subtotal = Math.max(0, subtotal - disc);

  let paymentParts = { cash: 0, pos: 0 };
  try {
    paymentParts = resolvePaymentAmounts(payload.paymentType, subtotal, payload.cashAmount, payload.posAmount);
  } catch {
    paymentParts = { cash: payload.paymentType === "cash" ? subtotal : 0, pos: payload.paymentType === "pos" ? subtotal : 0 };
  }

  const createdAt = payload.createdAt || new Date().toISOString();

  return {
    id: clientSaleId,
    clientSaleId,
    code: saleCode(),
    createdAt,
    paymentType: payload.paymentType,
    customerId: payload.customerId || null,
    staffName: payload.staffName || "Admin",
    note: payload.note || "",
    discount: disc,
    discountType: payload.discountType || "TL",
    paidAmount: Number(payload.paidAmount) || subtotal,
    total: subtotal,
    cashAmount: paymentParts.cash,
    posAmount: paymentParts.pos,
    paymentMethodId: payload.paymentMethodId || payload.payment_method_id || null,
    paymentMethodName: payload.paymentMethodName || payload.payment_method_name || null,
    pendingSync: true,
    items: items.map((item, index) => ({
      id: `${clientSaleId}_line_${index}`,
      productId: item.productId || null,
      name: item.name,
      qty: item.qty,
      price: item.price,
      discount: item.discount || 0,
      note: item.note || "",
    })),
  };
}

export function buildLocalCashWithdrawal(payload, clientId, staffName) {
  return {
    id: clientId,
    clientId,
    staffId: payload.staffId || null,
    staffName: staffName || payload.staffName || "Kassa",
    amount: Number(payload.amount),
    reason: payload.reason,
    note: payload.note || "",
    createdAt: payload.createdAt || new Date().toISOString(),
    pendingSync: true,
  };
}

export function buildLocalExpense(payload, clientId) {
  return {
    id: clientId,
    clientId,
    title: payload.title,
    amount: Number(payload.amount),
    typeId: payload.typeId,
    date: payload.date || new Date().toISOString().slice(0, 10),
    pendingSync: true,
  };
}
