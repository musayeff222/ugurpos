export function isGramUnit(unit) {
  const value = String(unit || "").toLocaleLowerCase("az");
  return value.includes("qram") || value.includes("gram") || value === "g" || value === "gr";
}

export function formatGrams(qty) {
  const n = Number(qty) || 0;
  if (n <= 0) return "0 qram";
  return `${Number.isInteger(n) ? n : Math.round(n * 100) / 100} qram`;
}

export function formatStockLabel(stock, unit) {
  if (isGramUnit(unit)) return formatGrams(stock);
  return String(Number(stock) || 0);
}

/** price1 = AZN/kq → sətir qiyməti AZN/qram */
export function unitPriceForCart(product, priceType = "price1") {
  const raw = Number(product?.[priceType] ?? product?.price1) || 0;
  if (isGramUnit(product?.unit)) return raw / 1000;
  return raw;
}

export function cartLineLabel(line) {
  if (line?.unit === "qram" || isGramUnit(line?.unit)) {
    return `${formatGrams(line.qty)} ${line.name}`;
  }
  return line?.name || "";
}
