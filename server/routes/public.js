import { Router } from "express";
import { getDb, getDataDir, uid, rowToProduct } from "../db/index.js";
import {
  getDefaultFirmSettings,
  ensureFirmSettings,
  resolveFirmByMenuSlug,
  rowToFirmMenu,
  rowToMenuBranch,
  getBranchForFirmMenu,
} from "../utils/qrMenu.js";
import { loadQrOrder } from "../utils/qrOrderService.js";
import {
  resolveProductImageFile,
  contentTypeForImagePath,
} from "../utils/productImage.js";

const router = Router();

function getFirmName(db, firmId) {
  const user = db.prepare("SELECT firm_name FROM users WHERE firm_id = ? LIMIT 1").get(firmId);
  return user?.firm_name || "Firma";
}

function bootstrapFirmSettings(db) {
  const user = db.prepare("SELECT firm_id, firm_name FROM users LIMIT 1").get();
  if (user) ensureFirmSettings(db, user.firm_id, user.firm_name);
}

function requirePublicMenu(db, slug, res) {
  bootstrapFirmSettings(db);
  const firmRow = slug ? resolveFirmByMenuSlug(db, slug) : getDefaultFirmSettings(db);
  if (!firmRow) {
    res.status(404).json({
      error: "Menü henüz kurulmamış. Admin panelden giriş yapıp QR Menü sayfasını açın.",
    });
    return null;
  }
  if (!firmRow.menu_enabled) {
    res.status(403).json({
      error: "Menü kapalı. Admin panel → QR Menü → “QR menü aktif” seçeneğini açıp kaydedin.",
    });
    return null;
  }
  return firmRow;
}

function sendFirmMenu(db, res, firmRow) {
  const firmName = getFirmName(db, firmRow.firm_id);
  const branches = db
    .prepare(
      `SELECT * FROM branches
       WHERE firm_id = ? AND active = 1 AND menu_enabled = 1
       ORDER BY CAST(code AS INTEGER), name`
    )
    .all(firmRow.firm_id)
    .map(rowToMenuBranch);

  res.json({
    firm: rowToFirmMenu(firmRow, firmName),
    branches,
  });
}

function sendBranchMenu(db, res, firmRow, branchId) {
  const branch = getBranchForFirmMenu(db, firmRow.firm_id, branchId);
  if (!branch) return res.status(404).json({ error: "Şube bulunamadı veya menüde değil" });

  const groups = db
    .prepare("SELECT id, name FROM groups WHERE branch_id = ? ORDER BY name")
    .all(branch.id);
  const products = db
    .prepare(
      "SELECT * FROM products WHERE branch_id = ? AND active = 1 AND on_sale_page = 1 ORDER BY name"
    )
    .all(branch.id)
    .map(rowToProduct);

  res.json({
    firm: rowToFirmMenu(firmRow, getFirmName(db, firmRow.firm_id)),
    branch: rowToMenuBranch(branch),
    groups,
    products,
  });
}

function generateQrOrderCode() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `Q${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function createOrder(db, res, firmRow, branchId, body) {
  const branch = getBranchForFirmMenu(db, firmRow.firm_id, branchId);
  if (!branch) return res.status(404).json({ error: "Şube bulunamadı" });
  if (!branch.menu_accept_orders) {
    return res.status(400).json({ error: "Bu şube şu an sipariş kabul etmiyor" });
  }

  const { customerName, customerPhone, tableNo, note, items } = body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Sepet boş" });
  }
  if (!customerName?.trim()) {
    return res.status(400).json({ error: "Ad soyad gerekli" });
  }

  const productLookup = db.prepare(
    "SELECT * FROM products WHERE id = ? AND branch_id = ? AND active = 1 AND on_sale_page = 1"
  );
  const orderId = uid("qo");
  const orderCode = generateQrOrderCode();
  let total = 0;
  const lineItems = [];

  for (const line of items) {
    const product = productLookup.get(line.productId, branch.id);
    if (!product) return res.status(400).json({ error: "Geçersiz ürün" });
    const qty = Math.max(1, Number(line.qty) || 1);
    const price = Number(product.price1) || 0;
    total += qty * price;
    lineItems.push({
      id: uid("qoi"),
      productId: product.id,
      name: product.name,
      qty,
      price,
      note: line.note || "",
    });
  }

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO qr_orders (id, branch_id, code, status, customer_name, customer_phone, table_no, note, total)
       VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)`
    ).run(
      orderId,
      branch.id,
      orderCode,
      customerName.trim(),
      customerPhone?.trim() || "",
      tableNo?.trim() || "",
      note?.trim() || "",
      total
    );

    const insItem = db.prepare(
      "INSERT INTO qr_order_items (id, order_id, product_id, name, qty, price, note) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    lineItems.forEach((item) => {
      insItem.run(item.id, orderId, item.productId, item.name, item.qty, item.price, item.note);
    });
  });

  tx();
  res.status(201).json(loadQrOrder(db, orderId, branch.id));
}

// Slug-free routes (tek link: /m)
router.get("/menu", (req, res) => {
  const db = getDb();
  const firmRow = requirePublicMenu(db, null, res);
  if (!firmRow) return;
  sendFirmMenu(db, res, firmRow);
});

router.get("/menu/branches/:branchId", (req, res) => {
  const db = getDb();
  const firmRow = requirePublicMenu(db, null, res);
  if (!firmRow) return;
  sendBranchMenu(db, res, firmRow, req.params.branchId);
});

router.get("/menu/branches/:branchId/products/:productId/image", (req, res) => {
  const db = getDb();
  const firmRow = requirePublicMenu(db, null, res);
  if (!firmRow) return;

  const branch = getBranchForFirmMenu(db, firmRow.firm_id, req.params.branchId);
  if (!branch) return res.status(404).end();

  const product = db
    .prepare(
      "SELECT image_path FROM products WHERE id = ? AND branch_id = ? AND active = 1 AND on_sale_page = 1"
    )
    .get(req.params.productId, branch.id);
  if (!product?.image_path) return res.status(404).end();

  const filePath = resolveProductImageFile(getDataDir(), branch.id, product.image_path);
  if (!filePath) return res.status(404).end();

  res.setHeader("Content-Type", contentTypeForImagePath(product.image_path));
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.sendFile(filePath);
});

router.post("/menu/branches/:branchId/orders", (req, res) => {
  const db = getDb();
  const firmRow = requirePublicMenu(db, null, res);
  if (!firmRow) return;
  createOrder(db, res, firmRow, req.params.branchId, req.body);
});

// Eski slug'lı linkler (geriye uyumluluk)
router.get("/menu/:slug", (req, res) => {
  if (req.params.slug === "branches") return res.status(404).json({ error: "Geçersiz menü adresi" });
  const db = getDb();
  const firmRow = requirePublicMenu(db, req.params.slug, res);
  if (!firmRow) return;
  sendFirmMenu(db, res, firmRow);
});

router.get("/menu/:slug/branches/:branchId", (req, res) => {
  const db = getDb();
  const firmRow = requirePublicMenu(db, req.params.slug, res);
  if (!firmRow) return;
  sendBranchMenu(db, res, firmRow, req.params.branchId);
});

router.get("/menu/:slug/branches/:branchId/products/:productId/image", (req, res) => {
  const db = getDb();
  const firmRow = requirePublicMenu(db, req.params.slug, res);
  if (!firmRow) return;

  const branch = getBranchForFirmMenu(db, firmRow.firm_id, req.params.branchId);
  if (!branch) return res.status(404).end();

  const product = db
    .prepare(
      "SELECT image_path FROM products WHERE id = ? AND branch_id = ? AND active = 1 AND on_sale_page = 1"
    )
    .get(req.params.productId, branch.id);
  if (!product?.image_path) return res.status(404).end();

  const filePath = resolveProductImageFile(getDataDir(), branch.id, product.image_path);
  if (!filePath) return res.status(404).end();

  res.setHeader("Content-Type", contentTypeForImagePath(product.image_path));
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.sendFile(filePath);
});

router.post("/menu/:slug/branches/:branchId/orders", (req, res) => {
  const db = getDb();
  const firmRow = requirePublicMenu(db, req.params.slug, res);
  if (!firmRow) return;
  createOrder(db, res, firmRow, req.params.branchId, req.body);
});

router.get("/orders/:orderId", (req, res) => {
  const db = getDb();
  const order = loadQrOrder(db, req.params.orderId);
  if (!order) return res.status(404).json({ error: "Sipariş bulunamadı" });
  res.json(order);
});

export default router;
