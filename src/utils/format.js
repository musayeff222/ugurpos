export function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatMoney(value, lang = "tr") {
  const num = Number(value) || 0;
  if (lang === "az") {
    return `${num.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼`;
  }
  return `₺ ${num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(date = new Date(), lang = "tr") {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(lang === "az" ? "az-AZ" : "tr-TR");
}

export function formatDateTime(date = new Date(), lang = "tr") {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString(lang === "az" ? "az-AZ" : "tr-TR");
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function generateSaleCode() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `S${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export function calcLineTotal(qty, price, discount = 0) {
  const subtotal = qty * price;
  return Math.max(0, subtotal - discount);
}

export function calcCartTotal(items, cartDiscount = 0, cartDiscountType = "TL") {
  const subtotal = items.reduce((sum, item) => sum + calcLineTotal(item.qty, item.price, item.discount || 0), 0);
  if (cartDiscountType === "Yüzde") {
    return Math.max(0, subtotal - (subtotal * cartDiscount) / 100);
  }
  return Math.max(0, subtotal - cartDiscount);
}

export function isSameDay(a, b) {
  return a.slice(0, 10) === b.slice(0, 10);
}

export function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
