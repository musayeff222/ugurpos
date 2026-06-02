/** EAN-13 check digit for first 12 digits */
function ean13CheckDigit(code12) {
  const digits = String(code12).padStart(12, "0").slice(-12).split("").map(Number);
  let sum = 0;
  digits.forEach((d, i) => {
    sum += d * (i % 2 === 0 ? 1 : 3);
  });
  return (10 - (sum % 10)) % 10;
}

function buildEan13(base12) {
  const b = String(base12).padStart(12, "0").slice(-12);
  return b + ean13CheckDigit(b);
}

/** Turkey domestic prefix 869 + unique sequence */
export function generateProductBarcode(db) {
  const prefix = "869";
  const count = db.prepare("SELECT COUNT(*) as c FROM products").get().c;

  for (let i = 0; i < 200; i++) {
    const seq = String(count + i + 1).padStart(9, "0");
    const barcode = buildEan13(prefix + seq);
    const exists = db.prepare("SELECT id FROM products WHERE barcode = ?").get(barcode);
    if (!exists) return barcode;
  }

  const fallback = buildEan13(prefix + Date.now().toString().slice(-9));
  return fallback;
}

export function generateStockCode(db) {
  const count = db.prepare("SELECT COUNT(*) as c FROM products").get().c;
  for (let i = count + 1; i < count + 500; i++) {
    const code = `STK-${String(i).padStart(4, "0")}`;
    const exists = db.prepare("SELECT id FROM products WHERE stock_code = ?").get(code);
    if (!exists) return code;
  }
  return `STK-${Date.now().toString().slice(-6)}`;
}
