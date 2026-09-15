export const RAW_UNITS = ["kq", "qram", "litr", "ml", "ədəd", "paket"];

function normalizeUnit(unit) {
  const value = String(unit || "").trim().toLowerCase();
  if (value === "kg" || value === "kilo" || value === "kilogram") return "kq";
  if (value === "g" || value === "gr" || value === "gram") return "qram";
  if (value === "l" || value === "lt" || value === "liter") return "litr";
  if (value === "ədəd" || value === "eded" || value === "adet") return "ədəd";
  return value || "kq";
}

function familyOf(unit) {
  const value = normalizeUnit(unit);
  if (value === "kq" || value === "qram") return "weight";
  if (value === "litr" || value === "ml") return "volume";
  return "other";
}

export function compatibleUnits(unit) {
  const family = familyOf(unit);
  if (family === "weight") return ["qram", "kq"];
  if (family === "volume") return ["ml", "litr"];
  return [normalizeUnit(unit)];
}

export function defaultInputUnit(unit) {
  const family = familyOf(unit);
  if (family === "weight") return "qram";
  if (family === "volume") return "ml";
  return normalizeUnit(unit);
}

export function convertQty(qty, fromUnit, toUnit) {
  const amount = Number(qty);
  if (!Number.isFinite(amount)) return 0;
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  if (from === to) return amount;
  if (familyOf(from) !== familyOf(to) || familyOf(from) === "other") return amount;
  if (from === "kq" && to === "qram") return amount * 1000;
  if (from === "qram" && to === "kq") return amount / 1000;
  if (from === "litr" && to === "ml") return amount * 1000;
  if (from === "ml" && to === "litr") return amount / 1000;
  return amount;
}

export function roundQty(qty) {
  return Math.round(Number(qty || 0) * 1000) / 1000;
}

export function formatStock(stock, unit) {
  const value = roundQty(stock);
  const base = normalizeUnit(unit);
  if (base === "kq") return `${value} kq (${roundQty(value * 1000)} qram)`;
  if (base === "litr") return `${value} litr (${roundQty(value * 1000)} ml)`;
  return `${value} ${base}`;
}
