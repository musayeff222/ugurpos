export function getSalePaymentParts(sale) {
  const total = Number(sale?.total ?? 0);
  const type = sale?.paymentType || sale?.payment_type || "";
  const cashStored = Number(sale?.cashAmount ?? sale?.cash_amount);
  const posStored = Number(sale?.posAmount ?? sale?.pos_amount);

  if (type === "partial" || (cashStored > 0 && posStored > 0)) {
    return { cash: cashStored, pos: posStored };
  }
  if (type === "cash") return { cash: total, pos: 0 };
  if (type === "pos") return { cash: 0, pos: total };
  return { cash: 0, pos: 0 };
}

export function resolvePaymentAmounts(paymentType, total, cashAmount, posAmount) {
  const amount = Number(total) || 0;
  if (paymentType === "partial") {
    const cash = Number(cashAmount) || 0;
    const pos = Number(posAmount) || 0;
    if (cash <= 0 && pos <= 0) {
      throw new Error("Nakit və ya kart məbləği daxil edin");
    }
    if (Math.abs(cash + pos - amount) > 0.009) {
      throw new Error("Nakit + kart məbləği toplam satışa bərabər olmalıdır");
    }
    return { cash, pos };
  }
  if (paymentType === "cash") return { cash: amount, pos: 0 };
  if (paymentType === "pos") return { cash: 0, pos: amount };
  return { cash: 0, pos: 0 };
}
