export function getSalePaymentParts(sale) {
  const total = Number(sale?.total ?? 0);
  const type = sale?.paymentType || "";
  const cashStored = Number(sale?.cashAmount);
  const posStored = Number(sale?.posAmount);

  if (type === "partial" || (cashStored > 0 && posStored > 0)) {
    return { cash: cashStored, pos: posStored };
  }
  if (type === "cash") return { cash: total, pos: 0 };
  if (type === "pos") return { cash: 0, pos: total };
  return { cash: 0, pos: 0 };
}

export function paymentLabel(type, sale) {
  if (type === "cash") return "Nakit";
  if (type === "pos") return "Pos";
  if (type === "open") return "Açık Hesap";
  if (type === "partial") {
    const parts = getSalePaymentParts(sale || { paymentType: type });
    return `Hissəli (N: ${parts.cash.toFixed(2)} / K: ${parts.pos.toFixed(2)})`;
  }
  if (type === "refund") return "İade";
  return type || "—";
}
