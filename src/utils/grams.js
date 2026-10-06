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

function normName(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/\u0307/g, "")
    .replace(/\s+/g, " ");
}

function warehouseRank(product) {
  if (!isGramUnit(product?.unit)) return 9;
  if (!product.firmProductId && product.onSalePage === false) return 0;
  if (!product.firmProductId) return 1;
  return 4;
}

/** Növbədə satılan və anbarda qalan istehsalat çəkisi. */
export function shiftGramBalances(products, sales) {
  const remaining = new Map();
  for (const product of products || []) {
    const rank = warehouseRank(product);
    if (rank > 1) continue;
    const key = normName(product.name);
    if (!key) continue;
    const prev = remaining.get(key);
    if (!prev || rank < prev.rank) {
      remaining.set(key, { name: product.name, stock: Number(product.stock) || 0, rank });
    }
  }

  const sold = new Map();
  const addSold = (name, grams) => {
    const key = normName(name);
    const amount = Number(grams) || 0;
    if (!key || !amount) return;
    const prev = sold.get(key) || { name, grams: 0 };
    prev.grams += amount;
    sold.set(key, prev);
  };

  for (const sale of sales || []) {
    const sign = sale.paymentType === "refund" ? -1 : 1;
    for (const item of sale.items || []) {
      const product = (products || []).find((row) => row.id === item.productId);
      const qty = Number(item.qty) || 0;
      if (!qty) continue;
      if (isGramUnit(product?.unit) || isGramUnit(item.unit)) {
        addSold(product?.name || item.name, qty * sign);
        continue;
      }
      for (const ingredient of product?.ingredients || []) {
        addSold(ingredient.name, (Number(ingredient.grams) || 0) * qty * sign);
      }
    }
  }

  const keys = new Set([...remaining.keys(), ...sold.keys()]);
  const lines = [...keys]
    .map((key) => {
      const left = remaining.get(key);
      const used = sold.get(key);
      return {
        name: left?.name || used?.name || key,
        soldGrams: Math.max(0, Number(used?.grams) || 0),
        remainingGrams: Number(left?.stock) || 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));

  return {
    lines,
    soldGrams: lines.reduce((sum, line) => sum + line.soldGrams, 0),
    remainingGrams: lines.reduce((sum, line) => sum + line.remainingGrams, 0),
  };
}

export function cartLineLabel(line) {
  if (line?.unit === "qram" || isGramUnit(line?.unit)) {
    return `${formatGrams(line.qty)} ${line.name}`;
  }
  return line?.name || "";
}
