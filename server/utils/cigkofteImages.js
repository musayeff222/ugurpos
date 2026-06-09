import fs from "fs";
import path from "path";
import { CIGKOFTA_PRODUCTS, SEED_IMAGE_DIR } from "../seed/cigkofte/seedProducts.js";
import { resolveUploadsRoot } from "./uploadsDir.js";

const STOCK_TO_IMAGE = Object.fromEntries(CIGKOFTA_PRODUCTS.map((p) => [p.stockCode, p.image]));
const BARCODE_TO_IMAGE = Object.fromEntries(CIGKOFTA_PRODUCTS.map((p) => [p.barcode, p.image]));

export function seedImageFilenameForStockCode(stockCode) {
  if (!stockCode) return null;
  return STOCK_TO_IMAGE[stockCode] || null;
}

export function seedImageFilenameForBarcode(barcode) {
  if (!barcode) return null;
  return BARCODE_TO_IMAGE[barcode] || null;
}

export function seedImagePublicUrl(stockCode) {
  const filename = seedImageFilenameForStockCode(stockCode);
  if (!filename) return null;
  return `/uploads/seed/${encodeURIComponent(filename)}`;
}

export function resolveSeedImageFile(stockCode, barcode) {
  const filename =
    seedImageFilenameForStockCode(stockCode) || seedImageFilenameForBarcode(barcode);
  if (!filename) return null;

  const published = path.join(resolveUploadsRoot(), "seed", filename);
  if (fs.existsSync(published)) return published;

  const src = path.join(SEED_IMAGE_DIR, filename);
  if (fs.existsSync(src)) return src;

  return null;
}

/** Seed resimlerini public_html/uploads/seed altina kopyalar (deploy sonrasi da calisir). */
export function publishCigkofteSeedImages() {
  const destDir = path.join(resolveUploadsRoot(), "seed");
  fs.mkdirSync(destDir, { recursive: true });
  let copied = 0;
  for (const product of CIGKOFTA_PRODUCTS) {
    const src = path.join(SEED_IMAGE_DIR, product.image);
    const dest = path.join(destDir, product.image);
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, dest);
    copied += 1;
  }
  return copied;
}
