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

function gramRank(product) {
  if (!isGramUnit(product?.unit)) return 9;
  return product?.firmProductId ? 1 : 0;
}

/** Növbədə satılan və anbarda qalan istehsalat çəkisi. */
export function shiftGramBalances(products, sales) {
  const list = products || [];
  const byId = new Map(list.map((product) => [product.id, product]));
  const byName = new Map();
  const recipesByName = new Map();

  for (const product of list) {
    const key = normName(product.name);
    if (!key) continue;
    const named = byName.get(key) || [];
    named.push(product);
    byName.set(key, named);
    const recipes = product.ingredients || [];
    if (recipes.length && !recipesByName.has(key)) recipesByName.set(key, recipes);
  }

  const pieceOnly = (key) => {
    const named = byName.get(key) || [];
    return named.length > 0 && !named.some((product) => isGramUnit(product.unit));
  };

  const remaining = new Map();
  for (const product of list) {
    const rank = gramRank(product);
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
    if (!key || !(amount > 0 || amount < 0)) return;
    const prev = sold.get(key) || { name, grams: 0 };
    prev.grams += amount;
    if (!prev.name && name) prev.name = name;
    sold.set(key, prev);
  };

  for (const sale of sales || []) {
    const sign = sale.paymentType === "refund" ? -1 : 1;
    for (const item of sale.items || []) {
      const qty = Number(item.qty) || 0;
      if (!qty) continue;
      const nameKey = normName(item.name);
      const named = byName.get(nameKey) || [];
      const product =
        (item.productId && byId.get(item.productId)) ||
        named.find((row) => (row.ingredients || []).length) ||
        named[0] ||
        null;
      const recipes =
        (product?.ingredients && product.ingredients.length
          ? product.ingredients
          : null) ||
        recipesByName.get(normName(product?.name || item.name)) ||
        [];

      if (isGramUnit(product?.unit) || isGramUnit(item.unit)) {
        addSold(product?.name || item.name, qty * sign);
        continue;
      }
      if (recipes.length) {
        for (const ingredient of recipes) {
          const ingredientKey = normName(ingredient.name);
          // Ədəd tərkib (məs. ayran) qram xülasəsinə düşməsin
          if (pieceOnly(ingredientKey)) continue;
          const gramRow = remaining.get(ingredientKey);
          addSold(gramRow?.name || ingredient.name, (Number(ingredient.grams) || 0) * qty * sign);
        }
        continue;
      }
      // Tərkib yoxdursa, satılan ad anbar qram məhsulu ilə eynidirsə miqdarı qram say.
      if (remaining.has(nameKey)) {
        addSold(item.name, qty * sign);
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
    .filter((line) => line.soldGrams > 0 || line.remainingGrams > 0)
    .sort((a, b) => {
      if (b.soldGrams !== a.soldGrams) return b.soldGrams - a.soldGrams;
      return a.name.localeCompare(b.name, "tr");
    });

  const soldGrams = [...sold.values()].reduce((sum, row) => sum + Math.max(0, Number(row.grams) || 0), 0);
  return {
    lines,
    soldGrams,
    remainingGrams: lines.reduce((sum, line) => sum + line.remainingGrams, 0),
  };
}

export function cartLineLabel(line) {
  if (line?.unit === "qram" || isGramUnit(line?.unit)) {
    return `${formatGrams(line.qty)} ${line.name}`;
  }
  return line?.name || "";
}
