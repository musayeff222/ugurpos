import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getProductUploadDir } from "../../utils/productImage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const SEED_IMAGE_DIR = __dirname;

export const CIGKOFTA_GROUP = { id: "g_cigkofte", name: "Çiğköfte" };

export const CIGKOFTA_PRODUCTS = [
  {
    stockCode: "CKF-DURUM-100",
    barcode: "8690000100001",
    name: "Dürüm 100 gr",
    price1: 3,
    price2: 3,
    buyPrice: 1.5,
    stock: 999,
    criticalStock: 10,
    vat: 0,
    unit: "Adet",
    image: "durum-100gr.jpg",
  },
  {
    stockCode: "CKF-SPECIAL-159",
    barcode: "8690000100002",
    name: "Spaciel Dürüm 159 gr",
    price1: 5,
    price2: 5,
    buyPrice: 2.5,
    stock: 999,
    criticalStock: 10,
    vat: 0,
    unit: "Adet",
    image: "special-durum-159gr.jpg",
  },
  {
    stockCode: "CKF-PORS-250",
    barcode: "8690000100003",
    name: "1 Porsiyon 250 gr Çiğköfte",
    price1: 6,
    price2: 6,
    buyPrice: 3,
    stock: 999,
    criticalStock: 10,
    vat: 0,
    unit: "Porsiyon",
    image: "porsiyon-250gr.jpg",
  },
  {
    stockCode: "CKF-500",
    barcode: "8690000100004",
    name: "Çiğköfte 500 gr",
    price1: 12,
    price2: 12,
    buyPrice: 6,
    stock: 999,
    criticalStock: 5,
    vat: 0,
    unit: "Gram",
    image: "cigkofte-500gr.jpg",
  },
  {
    stockCode: "CKF-750",
    barcode: "8690000100005",
    name: "Çiğköfte 750 gr",
    price1: 18,
    price2: 18,
    buyPrice: 9,
    stock: 999,
    criticalStock: 5,
    vat: 0,
    unit: "Gram",
    image: "cigkofte-750gr.jpg",
  },
  {
    stockCode: "CKF-1000",
    barcode: "8690000100006",
    name: "Çiğköfte 1 kg",
    price1: 24,
    price2: 24,
    buyPrice: 12,
    stock: 999,
    criticalStock: 5,
    vat: 0,
    unit: "KG",
    image: "cigkofte-1kg.jpg",
  },
];

function attachProductImage(db, dataDir, branchId, productId, imageFile) {
  const src = path.join(SEED_IMAGE_DIR, imageFile);
  if (!fs.existsSync(src)) {
    console.warn(`[seed] Resim bulunamadi: ${imageFile}`);
    return false;
  }

  const dir = getProductUploadDir(dataDir, branchId);
  const filename = `${productId}.jpg`;
  const dest = path.join(dir, filename);
  const row = db
    .prepare("SELECT image_path FROM products WHERE id = ? AND branch_id = ?")
    .get(productId, branchId);

  if (row?.image_path === filename && fs.existsSync(dest)) {
    return true;
  }

  fs.copyFileSync(src, dest);
  db.prepare("UPDATE products SET image_path = ? WHERE id = ? AND branch_id = ?").run(
    filename,
    productId,
    branchId
  );
  return true;
}

export function seedCigkofteProducts(db, branchId, dataDir, { uid } = {}) {
  const makeId = uid || (() => `p_ckf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);

  const groupExists = db
    .prepare("SELECT id FROM `groups` WHERE id = ? AND branch_id = ?")
    .get(CIGKOFTA_GROUP.id, branchId);
  if (!groupExists) {
    db.prepare("INSERT INTO `groups` (id, name, branch_id) VALUES (?, ?, ?)").run(
      CIGKOFTA_GROUP.id,
      CIGKOFTA_GROUP.name,
      branchId
    );
  }

  const findByCode = db.prepare("SELECT id FROM products WHERE stock_code = ? AND branch_id = ?");
  const insertProduct = db.prepare(`
    INSERT INTO products (id, barcode, stock_code, name, group_id, stock, critical_stock, vat, buy_price, price1, price2, unit, on_sale_page, active, branch_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
  `);
  const updateProduct = db.prepare(`
    UPDATE products
    SET barcode = ?, name = ?, group_id = ?, stock = ?, critical_stock = ?, vat = ?, buy_price = ?, price1 = ?, price2 = ?, unit = ?, on_sale_page = 1, active = 1
    WHERE id = ? AND branch_id = ?
  `);

  let added = 0;
  let updated = 0;

  for (const product of CIGKOFTA_PRODUCTS) {
    const existing = findByCode.get(product.stockCode, branchId);
    let productId = existing?.id;

    if (productId) {
      updateProduct.run(
        product.barcode,
        product.name,
        CIGKOFTA_GROUP.id,
        product.stock,
        product.criticalStock,
        product.vat,
        product.buyPrice,
        product.price1,
        product.price2,
        product.unit,
        productId,
        branchId
      );
      updated += 1;
    } else {
      productId = makeId("p");
      insertProduct.run(
        productId,
        product.barcode,
        product.stockCode,
        product.name,
        CIGKOFTA_GROUP.id,
        product.stock,
        product.criticalStock,
        product.vat,
        product.buyPrice,
        product.price1,
        product.price2,
        product.unit,
        branchId
      );
      added += 1;
    }

    attachProductImage(db, dataDir, branchId, productId, product.image);
  }

  return { added, updated, total: CIGKOFTA_PRODUCTS.length };
}

export function seedCigkofteForAllBranches(db, dataDir, { uid } = {}) {
  const branches = db.prepare("SELECT id, name FROM branches ORDER BY name").all();
  const results = [];

  for (const branch of branches) {
    const result = seedCigkofteProducts(db, branch.id, dataDir, { uid });
    results.push({ branchId: branch.id, branchName: branch.name, ...result });
  }

  return results;
}
