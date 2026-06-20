import fs from "fs";
import { Router } from "express";
import { getDb, getAllState, getSaleWithItems, uid, rowToProduct, rowToCustomer } from "../db/index.js";
import { generateProductBarcode, generateStockCode } from "../utils/barcode.js";
import { branchMiddleware } from "../middleware/branch.js";
import {
  saveProductImage,
  deleteProductImage,
  resolveProductImageFile,
  contentTypeForImagePath,
} from "../utils/productImage.js";
import { productImageUpload } from "../middleware/imageUpload.js";
import { listQrOrders, updateQrOrderStatus } from "../utils/qrOrderService.js";
import { hashBranchPassword } from "../utils/branchAuth.js";
import { sql as SQL } from "../db/dialect.js";

const router = Router();
router.use(branchMiddleware);

function applyProductImage(db, branchId, productId, body, existingPath = null) {
  if (body.removeImage) {
    deleteProductImage(branchId, productId);
    db.prepare("UPDATE products SET image_path = NULL WHERE id = ? AND branch_id = ?").run(productId, branchId);
    return null;
  }

  if (body.imageData && body.imageMime) {
    const filename = saveProductImage(branchId, productId, body.imageData, body.imageMime);
    db.prepare("UPDATE products SET image_path = ? WHERE id = ? AND branch_id = ?").run(filename, productId, branchId);
    return filename;
  }

  return existingPath;
}

function handleProductImageError(res, err) {
  const message = err?.message || "Resim kaydedilemedi";
  console.error("[uploads] Urun resmi hatasi:", message);
  if (/resim|format|gecersiz|geçersiz|desteklenen|dosya|logo|gorsel|görsel|2mb|kaydedilemedi|permission|eacces/i.test(message)) {
    return res.status(400).json({ error: message });
  }
  throw err;
}

function generateSaleCode() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `S${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

// Full state sync (for frontend bootstrap)
router.get("/state", (req, res) => {
  res.json(getAllState(getDb(), req.branchId));
});

// Dashboard
router.get("/dashboard/summary", (req, res) => {
  const db = getDb();
  const { branchId } = req;
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const todaySales = db
    .prepare(
      `SELECT COUNT(*) as c, COALESCE(SUM(total),0) as t FROM sales WHERE branch_id = ? AND ${SQL.date("created_at")}=? AND payment_type != 'refund'`
    )
    .get(branchId, today);
  const monthSales = db
    .prepare(
      `SELECT COUNT(*) as c, COALESCE(SUM(total),0) as t FROM sales WHERE branch_id = ? AND ${SQL.month("created_at")}=? AND payment_type != 'refund'`
    )
    .get(branchId, month);
  const debt = db.prepare("SELECT COALESCE(SUM(debt),0) as t FROM customers WHERE branch_id = ?").get(branchId);
  const critical = db
    .prepare("SELECT COUNT(*) as c FROM products WHERE branch_id = ? AND stock <= critical_stock")
    .get(branchId);
  res.json({
    todayCount: todaySales.c,
    todayTotal: todaySales.t,
    monthCount: monthSales.c,
    monthTotal: monthSales.t,
    totalDebt: debt.t,
    criticalStock: critical.c,
    productCount: db.prepare("SELECT COUNT(*) as c FROM products WHERE branch_id = ?").get(branchId).c,
    customerCount: db.prepare("SELECT COUNT(*) as c FROM customers WHERE branch_id = ?").get(branchId).c,
  });
});

// Products
router.get("/products", (req, res) => {
  const db = getDb();
  let sql = "SELECT * FROM products WHERE branch_id = ?";
  const params = [req.branchId];
  if (req.query.active === "true") sql += " AND active = 1";
  if (req.query.onSalePage === "true") sql += " AND on_sale_page = 1";
  if (req.query.search) {
    sql += " AND (name LIKE ? OR barcode LIKE ? OR stock_code LIKE ?)";
    const q = `%${req.query.search}%`;
    params.push(q, q, q);
  }
  if (req.query.barcode) {
    sql += " AND (barcode = ? OR stock_code = ?)";
    params.push(req.query.barcode, req.query.barcode);
  }
  sql += " ORDER BY name";
  res.json(db.prepare(sql).all(...params).map(rowToProduct));
});

router.get("/products/:id/image", (req, res) => {
  const db = getDb();
  const row = db
    .prepare("SELECT image_path FROM products WHERE id = ? AND branch_id = ?")
    .get(req.params.id, req.branchId);
  if (!row?.image_path) return res.status(404).end();

  const filePath = resolveProductImageFile(req.branchId, row.image_path);
  if (!filePath) return res.status(404).end();

  res.setHeader("Content-Type", contentTypeForImagePath(row.image_path));
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.sendFile(filePath);
});

router.get("/products/:id", (req, res) => {
  const row = getDb().prepare("SELECT * FROM products WHERE id = ? AND branch_id = ?").get(req.params.id, req.branchId);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(rowToProduct(row));
});

router.post("/products", (req, res) => {
  const db = getDb();
  const p = req.body;
  const id = uid("p");
  const barcode = (p.barcode && String(p.barcode).trim()) || generateProductBarcode(db, req.branchId);
  const stockCode = (p.stockCode && String(p.stockCode).trim()) || generateStockCode(db, req.branchId);
  db.prepare(`
    INSERT INTO products (id, barcode, stock_code, name, group_id, stock, critical_stock, vat, buy_price, price1, price2, unit, on_sale_page, active, branch_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(
    id,
    barcode,
    stockCode,
    p.name,
    p.groupId || null,
    Number(p.stock) || 0,
    Number(p.criticalStock) || 5,
    Number(p.vat) || 20,
    Number(p.buyPrice) || 0,
    Number(p.price1) || 0,
    Number(p.price2) || 0,
    p.unit || "Adet",
    p.onSalePage ? 1 : 0,
    req.branchId
  );
  try {
    applyProductImage(db, req.branchId, id, p);
  } catch (err) {
    db.prepare("DELETE FROM products WHERE id = ? AND branch_id = ?").run(id, req.branchId);
    return handleProductImageError(res, err);
  }
  res.status(201).json(rowToProduct(db.prepare("SELECT * FROM products WHERE id = ?").get(id)));
});

/** Multipart urun resmi (Multer) — kalici public_html/uploads/products/ */
router.post("/products/:id/image-file", (req, res) => {
  productImageUpload.single("image")(req, res, (err) => {
    if (err) return handleProductImageError(res, err);

    const db = getDb();
    const existing = db
      .prepare("SELECT id FROM products WHERE id = ? AND branch_id = ?")
      .get(req.params.id, req.branchId);
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!req.file) return res.status(400).json({ error: "Resim dosyasi gerekli" });

    try {
      if (!req.file.path || !fs.existsSync(req.file.path)) {
        return res.status(500).json({ error: "Resim dosyasi diske yazilamadi" });
      }
      db.prepare("UPDATE products SET image_path = ? WHERE id = ? AND branch_id = ?").run(
        req.file.filename,
        req.params.id,
        req.branchId
      );
      console.log(`[uploads] Urun resmi kaydedildi: ${req.file.path}`);
      res.json(rowToProduct(db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id)));
    } catch (saveErr) {
      return handleProductImageError(res, saveErr);
    }
  });
});

router.patch("/products/:id", (req, res) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM products WHERE id = ? AND branch_id = ?").get(req.params.id, req.branchId);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const p = { ...rowToProduct(existing), ...req.body };
  db.prepare(`
    UPDATE products SET barcode=?, stock_code=?, name=?, group_id=?, stock=?, critical_stock=?, vat=?,
    buy_price=?, price1=?, price2=?, unit=?, on_sale_page=?, active=? WHERE id=?
  `).run(
    p.barcode,
    p.stockCode,
    p.name,
    p.groupId,
    p.stock,
    p.criticalStock,
    p.vat,
    p.buyPrice,
    p.price1,
    p.price2,
    p.unit || "Adet",
    p.onSalePage ? 1 : 0,
    p.active !== false ? 1 : 0,
    req.params.id
  );
  try {
    applyProductImage(db, req.branchId, req.params.id, req.body, existing.image_path);
  } catch (err) {
    return handleProductImageError(res, err);
  }
  res.json(rowToProduct(db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id)));
});

router.delete("/products", (req, res) => {
  const ids = req.body.ids || [];
  const db = getDb();
  const find = db.prepare("SELECT id, image_path FROM products WHERE id = ? AND branch_id = ?");
  const del = db.prepare("DELETE FROM products WHERE id = ? AND branch_id = ?");
  ids.forEach((id) => {
    const row = find.get(id, req.branchId);
    if (row) {
      deleteProductImage(req.branchId, id);
      del.run(id, req.branchId);
    }
  });
  res.json({ ok: true });
});

// Groups
router.get("/groups", (req, res) => {
  res.json(getDb().prepare("SELECT id, name FROM `groups` WHERE branch_id = ? ORDER BY name").all(req.branchId));
});

router.post("/groups", (req, res) => {
  const id = uid("g");
  getDb().prepare("INSERT INTO `groups` (id, name, branch_id) VALUES (?, ?, ?)").run(id, req.body.name, req.branchId);
  res.status(201).json({ id, name: req.body.name });
});

router.delete("/groups/:id", (req, res) => {
  getDb().prepare("DELETE FROM `groups` WHERE id = ? AND branch_id = ?").run(req.params.id, req.branchId);
  res.json({ ok: true });
});

// Customers
router.get("/customers", (req, res) => {
  res.json(getDb().prepare("SELECT * FROM customers WHERE branch_id = ? ORDER BY name").all(req.branchId).map(rowToCustomer));
});

router.get("/customers/:id", (req, res) => {
  const row = getDb().prepare("SELECT * FROM customers WHERE id = ? AND branch_id = ?").get(req.params.id, req.branchId);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(rowToCustomer(row));
});

router.post("/customers", (req, res) => {
  const db = getDb();
  const c = req.body;
  const id = uid("c");
  db.prepare(`
    INSERT INTO customers (id, name, phone, address, note, credit_limit, debt, purchase_count, branch_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(id, c.name, c.phone || "", c.address || "", c.note || "", Number(c.creditLimit) || 0, Number(c.debt) || 0, req.branchId);
  res.status(201).json(rowToCustomer(db.prepare("SELECT * FROM customers WHERE id = ?").get(id)));
});

router.patch("/customers/:id", (req, res) => {
  const db = getDb();
  const existing = rowToCustomer(db.prepare("SELECT * FROM customers WHERE id = ? AND branch_id = ?").get(req.params.id, req.branchId));
  if (!existing) return res.status(404).json({ error: "Not found" });
  const c = { ...existing, ...req.body };
  db.prepare(`
    UPDATE customers SET name=?, phone=?, address=?, note=?, credit_limit=?, debt=?, purchase_count=?, last_payment_date=? WHERE id=?
  `).run(c.name, c.phone, c.address, c.note, c.creditLimit, c.debt, c.purchaseCount, c.lastPaymentDate, req.params.id);
  res.json(rowToCustomer(db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id)));
});

router.delete("/customers/:id", (req, res) => {
  getDb().prepare("DELETE FROM customers WHERE id = ? AND branch_id = ?").run(req.params.id, req.branchId);
  res.json({ ok: true });
});

router.post("/customers/:id/payments", (req, res) => {
  const db = getDb();
  const amount = Number(req.body.amount);
  const customer = db.prepare("SELECT * FROM customers WHERE id = ? AND branch_id = ?").get(req.params.id, req.branchId);
  if (!customer) return res.status(404).json({ error: "Not found" });
  const newDebt = Math.max(0, customer.debt - amount);
  const today = new Date().toISOString().slice(0, 10);
  db.prepare("UPDATE customers SET debt = ?, last_payment_date = ? WHERE id = ?").run(newDebt, today, req.params.id);
  res.json(rowToCustomer(db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id)));
});

// Sales
router.get("/sales", (req, res) => {
  const db = getDb();
  let sql = "SELECT id FROM sales WHERE branch_id = ?";
  const params = [req.branchId];
  if (req.query.customerId) {
    sql += " AND customer_id = ?";
    params.push(req.query.customerId);
  }
  if (req.query.date) {
    sql += ` AND ${SQL.date("created_at")} = ?`;
    params.push(req.query.date);
  }
  sql += " ORDER BY created_at DESC";
  if (req.query.limit) sql += ` LIMIT ${Number(req.query.limit)}`;
  const ids = db.prepare(sql).all(...params);
  res.json(ids.map((r) => getSaleWithItems(db, r.id)));
});

router.post("/sales", (req, res) => {
  const db = getDb();
  const { items, paymentType, customerId, staffName, note, discount, discountType, paidAmount } = req.body;
  const resolvedStaffName = req.user?.loginType === "staff" ? req.user.staffName : staffName || "Admin";

  let subtotal = items.reduce((s, i) => s + i.qty * i.price - (i.discount || 0), 0);
  const disc = Number(discount) || 0;
  if (discountType === "Yüzde") subtotal = Math.max(0, subtotal - (subtotal * disc) / 100);
  else subtotal = Math.max(0, subtotal - disc);

  const saleId = uid("sale");
  const code = generateSaleCode();
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO sales (id, code, created_at, payment_type, customer_id, staff_name, note, discount, discount_type, paid_amount, total, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(saleId, code, now, paymentType, customerId || null, resolvedStaffName, note || "", disc, discountType || "TL", Number(paidAmount) || 0, subtotal, req.branchId);

    const insItem = db.prepare(`
      INSERT INTO sale_items (id, sale_id, product_id, name, qty, price, discount, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updStock = db.prepare("UPDATE products SET stock = CASE WHEN stock - ? < 0 THEN 0 ELSE stock - ? END WHERE id = ? AND branch_id = ?");

    items.forEach((item) => {
      insItem.run(uid("line"), saleId, item.productId || null, item.name, item.qty, item.price, item.discount || 0, item.note || "");
      if (item.productId && paymentType !== "refund") updStock.run(item.qty, item.qty, item.productId, req.branchId);
    });

    if (customerId) {
      if (paymentType === "open") {
        db.prepare("UPDATE customers SET debt = debt + ?, purchase_count = purchase_count + 1 WHERE id = ?").run(subtotal, customerId);
      } else {
        db.prepare("UPDATE customers SET purchase_count = purchase_count + 1 WHERE id = ?").run(customerId);
      }
    }
  });

  tx();
  res.status(201).json(getSaleWithItems(db, saleId));
});

router.post("/refunds", (req, res) => {
  const { items, note } = req.body;
  req.body.paymentType = "refund";
  req.body.items = items.map((i) => ({ ...i, price: Math.abs(i.price) }));
  req.body.note = note || "İade";
  req.body.discount = 0;
  req.body.paidAmount = 0;
  req.body.staffName = "Admin";

  const db = getDb();
  const negativeItems = items.map((i) => ({ ...i, qty: Math.abs(i.qty) }));

  // Restore stock
  const updStock = db.prepare("UPDATE products SET stock = stock + ? WHERE id = ? AND branch_id = ?");
  negativeItems.forEach((item) => {
    if (item.productId) updStock.run(item.qty, item.productId, req.branchId);
  });

  // Create refund sale with negative total
  const saleId = uid("sale");
  const code = generateSaleCode();
  const now = new Date().toISOString();
  const total = -negativeItems.reduce((s, i) => s + i.qty * i.price, 0);

  db.prepare(`
    INSERT INTO sales (id, code, created_at, payment_type, customer_id, staff_name, note, discount, discount_type, paid_amount, total, branch_id)
    VALUES (?, ?, ?, 'refund', NULL, 'Admin', ?, 0, 'TL', 0, ?, ?)
  `).run(saleId, code, now, note || "İade", total, req.branchId);

  const insItem = db.prepare(`
    INSERT INTO sale_items (id, sale_id, product_id, name, qty, price, discount, note) VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `);
  negativeItems.forEach((item) => {
    insItem.run(uid("line"), saleId, item.productId || null, item.name, item.qty, -Math.abs(item.price), item.note || "");
  });

  res.status(201).json(getSaleWithItems(db, saleId));
});

// Staff
router.get("/staff", (req, res) => {
  res.json(
    getDb()
      .prepare("SELECT * FROM staff WHERE branch_id = ? ORDER BY name")
      .all(req.branchId)
      .map((r) => ({
        id: r.id,
        name: r.name,
        surname: r.surname || "",
        login: r.login || "",
        hasPassword: !!r.password_hash,
        code: r.code,
        role: r.role,
        active: !!r.active,
      }))
  );
});

router.post("/staff", (req, res) => {
  const id = uid("s");
  const { name, surname, login, password, code, role } = req.body;
  const normalizedLogin = login?.trim().toLowerCase() || "";
  const passwordHash = password?.trim() ? hashBranchPassword(password) : null;
  getDb()
    .prepare("INSERT INTO staff (id, name, surname, login, password_hash, code, role, active, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)")
    .run(id, name, surname || "", normalizedLogin, passwordHash, code || "", role || "Kasiyer", req.branchId);
  res.status(201).json({ id, name, surname: surname || "", login: normalizedLogin, code, role, active: true });
});

router.patch("/staff/:id", (req, res) => {
  const db = getDb();
  const s = req.body;
  const existing = db.prepare("SELECT * FROM staff WHERE id = ? AND branch_id = ?").get(req.params.id, req.branchId);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const passwordHash = s.password?.trim() ? hashBranchPassword(s.password) : existing.password_hash;
  db.prepare("UPDATE staff SET name=?, surname=?, login=?, password_hash=?, code=?, role=?, active=? WHERE id=? AND branch_id=?").run(
    s.name,
    s.surname || "",
    s.login?.trim().toLowerCase() || "",
    passwordHash,
    s.code,
    s.role || "Kasiyer",
    s.active !== false ? 1 : 0,
    req.params.id,
    req.branchId
  );
  res.json({ ok: true });
});

router.delete("/staff/:id", (req, res) => {
  getDb().prepare("DELETE FROM staff WHERE id = ? AND branch_id = ?").run(req.params.id, req.branchId);
  res.json({ ok: true });
});

// Firms
router.get("/firms", (req, res) => {
  res.json(
    getDb()
      .prepare("SELECT * FROM firms WHERE branch_id = ? ORDER BY name")
      .all(req.branchId)
      .map((r) => ({ id: r.id, name: r.name, phone: r.phone, taxNo: r.tax_no, balance: r.balance }))
  );
});

router.post("/firms", (req, res) => {
  const id = uid("f");
  const { name, phone, taxNo } = req.body;
  getDb()
    .prepare("INSERT INTO firms (id, name, phone, tax_no, balance, branch_id) VALUES (?, ?, ?, ?, 0, ?)")
    .run(id, name, phone || "", taxNo || "", req.branchId);
  res.status(201).json({ id, name, phone, taxNo, balance: 0 });
});

router.patch("/firms/:id", (req, res) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM firms WHERE id = ? AND branch_id = ?").get(req.params.id, req.branchId);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const { name, phone, taxNo, balance } = req.body;
  db.prepare("UPDATE firms SET name=?, phone=?, tax_no=?, balance=? WHERE id=?").run(
    name ?? existing.name,
    phone ?? existing.phone,
    taxNo ?? existing.tax_no,
    balance ?? existing.balance,
    req.params.id
  );
  const row = db.prepare("SELECT * FROM firms WHERE id = ?").get(req.params.id);
  res.json({ id: row.id, name: row.name, phone: row.phone, taxNo: row.tax_no, balance: row.balance });
});

router.delete("/firms/:id", (req, res) => {
  getDb().prepare("DELETE FROM firms WHERE id = ? AND branch_id = ?").run(req.params.id, req.branchId);
  res.json({ ok: true });
});

// Payment methods
router.get("/payment-methods", (req, res) => {
  res.json(
    getDb()
      .prepare("SELECT * FROM payment_methods WHERE branch_id = ?")
      .all(req.branchId)
      .map((r) => ({ id: r.id, name: r.name, active: !!r.active }))
  );
});

router.post("/payment-methods", (req, res) => {
  const id = uid("pm");
  getDb()
    .prepare("INSERT INTO payment_methods (id, name, active, branch_id) VALUES (?, ?, 1, ?)")
    .run(id, req.body.name, req.branchId);
  res.status(201).json({ id, name: req.body.name, active: true });
});

router.patch("/payment-methods/:id", (req, res) => {
  getDb()
    .prepare("UPDATE payment_methods SET name=?, active=? WHERE id=? AND branch_id=?")
    .run(req.body.name, req.body.active ? 1 : 0, req.params.id, req.branchId);
  res.json({ ok: true });
});

// Finance
router.get("/income", (req, res) => {
  res.json(getAllState(getDb(), req.branchId).income);
});

router.post("/income", (req, res) => {
  const id = uid("inc");
  const { title, amount, typeId, date } = req.body;
  getDb()
    .prepare("INSERT INTO income_entries (id, title, amount, type_id, date, branch_id) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, title, Number(amount), typeId, date || new Date().toISOString().slice(0, 10), req.branchId);
  res.status(201).json({ id, title, amount: Number(amount), typeId, date });
});

router.get("/expense", (req, res) => {
  res.json(getAllState(getDb(), req.branchId).expense);
});

router.post("/expense", (req, res) => {
  const id = uid("exp");
  const { title, amount, typeId, date } = req.body;
  getDb()
    .prepare("INSERT INTO expense_entries (id, title, amount, type_id, date, branch_id) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, title, Number(amount), typeId, date || new Date().toISOString().slice(0, 10), req.branchId);
  res.status(201).json({ id, title, amount: Number(amount), typeId, date });
});

router.get("/income-types", (req, res) => res.json(getAllState(getDb(), req.branchId).incomeTypes));
router.get("/expense-types", (req, res) => res.json(getAllState(getDb(), req.branchId).expenseTypes));

router.post("/income-types", (req, res) => {
  const id = uid("it");
  getDb().prepare("INSERT INTO income_types (id, name, branch_id) VALUES (?, ?, ?)").run(id, req.body.name, req.branchId);
  res.status(201).json({ id, name: req.body.name });
});

router.post("/expense-types", (req, res) => {
  const id = uid("et");
  getDb().prepare("INSERT INTO expense_types (id, name, branch_id) VALUES (?, ?, ?)").run(id, req.body.name, req.branchId);
  res.status(201).json({ id, name: req.body.name });
});

// Tasks
router.get("/tasks", (req, res) => res.json(getAllState(getDb(), req.branchId).tasks));

router.post("/tasks", (req, res) => {
  const id = uid("t");
  const { title, assignee, dueDate, status } = req.body;
  getDb()
    .prepare("INSERT INTO tasks (id, title, status, assignee, due_date, branch_id) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, title, status || "open", assignee || "", dueDate || "", req.branchId);
  res.status(201).json({ id, title, status: status || "open", assignee, dueDate });
});

router.patch("/tasks/:id", (req, res) => {
  const { title, status, assignee, dueDate } = req.body;
  getDb()
    .prepare("UPDATE tasks SET title=?, status=?, assignee=?, due_date=? WHERE id=? AND branch_id=?")
    .run(title, status, assignee, dueDate, req.params.id, req.branchId);
  res.json({ ok: true });
});

router.delete("/tasks/:id", (req, res) => {
  getDb().prepare("DELETE FROM tasks WHERE id = ? AND branch_id = ?").run(req.params.id, req.branchId);
  res.json({ ok: true });
});

// Stock counts
router.get("/stock-counts", (req, res) => res.json(getAllState(getDb(), req.branchId).stockCounts));

router.post("/stock-counts", (req, res) => {
  const db = getDb();
  const { productId, counted, note } = req.body;
  const product = db.prepare("SELECT * FROM products WHERE id = ? AND branch_id = ?").get(productId, req.branchId);
  if (!product) return res.status(404).json({ error: "Product not found" });
  const id = uid("sc");
  const date = new Date().toISOString().slice(0, 10);
  const diff = Number(counted) - product.stock;
  db.prepare(`
    INSERT INTO stock_counts (id, product_id, product_name, previous_stock, counted, difference, note, date, branch_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, productId, product.name, product.stock, Number(counted), diff, note || "", date, req.branchId);
  db.prepare("UPDATE products SET stock = ? WHERE id = ? AND branch_id = ?").run(Number(counted), productId, req.branchId);
  res.status(201).json({ id, productId, productName: product.name, previous: product.stock, counted: Number(counted), difference: diff, note, date });
});

// Purchase invoices
router.get("/purchase-invoices", (req, res) => res.json(getAllState(getDb(), req.branchId).purchaseInvoices));

router.post("/purchase-invoices", (req, res) => {
  const db = getDb();
  const { invoiceNo, firmId, total, date } = req.body;
  const firm = db.prepare("SELECT * FROM firms WHERE id = ? AND branch_id = ?").get(firmId, req.branchId);
  const id = uid("pi");
  db.prepare(
    "INSERT INTO purchase_invoices (id, invoice_no, firm_id, firm_name, total, date, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, invoiceNo, firmId, firm?.name || "", Number(total), date || new Date().toISOString().slice(0, 10), req.branchId);
  res.status(201).json({ id, invoiceNo, firmId, firmName: firm?.name, total: Number(total), date });
});

// Refund requests
router.get("/refund-requests", (req, res) => res.json(getAllState(getDb(), req.branchId).refundRequests));

router.post("/refund-requests", (req, res) => {
  const id = uid("rr");
  const { productName, reason } = req.body;
  const date = new Date().toISOString().slice(0, 10);
  getDb()
    .prepare("INSERT INTO refund_requests (id, product_name, reason, status, date, branch_id) VALUES (?, ?, ?, 'pending', ?, ?)")
    .run(id, productName, reason, date, req.branchId);
  res.status(201).json({ id, productName, reason, status: "pending", date });
});

router.patch("/refund-requests/:id", (req, res) => {
  getDb()
    .prepare("UPDATE refund_requests SET status=? WHERE id=? AND branch_id=?")
    .run(req.body.status, req.params.id, req.branchId);
  res.json({ ok: true });
});

// Notices
router.get("/notices", (req, res) => res.json(getAllState(getDb(), req.branchId).notices));

router.patch("/notices/:id/read", (req, res) => {
  getDb().prepare("UPDATE notices SET read_flag = 1 WHERE id = ? AND branch_id = ?").run(req.params.id, req.branchId);
  res.json({ ok: true });
});

// Integrations
router.get("/integrations", (req, res) => res.json(getAllState(getDb(), req.branchId).integrations));

router.patch("/integrations/:id", (req, res) => {
  getDb()
    .prepare("UPDATE integrations SET status=? WHERE id=? AND branch_id=?")
    .run(req.body.status, req.params.id, req.branchId);
  res.json({ ok: true });
});

// Variants & sub-products
router.get("/variants", (req, res) => res.json(getAllState(getDb(), req.branchId).variants));
router.post("/variants", (req, res) => {
  const id = uid("v");
  const { productId, name, sku, price, stock } = req.body;
  getDb()
    .prepare("INSERT INTO variants (id, product_id, name, sku, price, stock, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, productId, name, sku || "", Number(price) || 0, Number(stock) || 0, req.branchId);
  res.status(201).json({ id, productId, name, sku, price, stock });
});
router.delete("/variants/:id", (req, res) => {
  getDb().prepare("DELETE FROM variants WHERE id = ? AND branch_id = ?").run(req.params.id, req.branchId);
  res.json({ ok: true });
});

router.get("/sub-products", (req, res) => res.json(getAllState(getDb(), req.branchId).subProducts));
router.post("/sub-products", (req, res) => {
  const id = uid("sp");
  const { parentProductId, name, qty } = req.body;
  getDb()
    .prepare("INSERT INTO sub_products (id, parent_product_id, name, qty, branch_id) VALUES (?, ?, ?, ?, ?)")
    .run(id, parentProductId, name, Number(qty) || 1, req.branchId);
  res.status(201).json({ id, parentProductId, name, qty });
});
router.delete("/sub-products/:id", (req, res) => {
  getDb().prepare("DELETE FROM sub_products WHERE id = ? AND branch_id = ?").run(req.params.id, req.branchId);
  res.json({ ok: true });
});

// E-invoices
router.get("/e-invoices", (req, res) => {
  const db = getDb();
  let sql = "SELECT * FROM e_invoices WHERE branch_id = ?";
  const params = [req.branchId];
  if (req.query.direction) {
    sql += " AND direction = ?";
    params.push(req.query.direction);
  }
  sql += " ORDER BY date DESC";
  res.json(
    db
      .prepare(sql)
      .all(...params)
      .map((r) => ({
        id: r.id,
        direction: r.direction,
        invoiceNo: r.invoice_no,
        customerName: r.customer_name,
        total: r.total,
        status: r.status,
        date: r.date,
      }))
  );
});

router.post("/e-invoices", (req, res) => {
  const id = uid("ei");
  const { direction, invoiceNo, customerName, total } = req.body;
  const date = new Date().toISOString().slice(0, 10);
  getDb()
    .prepare(
      "INSERT INTO e_invoices (id, direction, invoice_no, customer_name, total, status, date, branch_id) VALUES (?, ?, ?, ?, ?, 'sent', ?, ?)"
    )
    .run(id, direction || "outgoing", invoiceNo || "", customerName || "", Number(total) || 0, date, req.branchId);
  res.status(201).json({ id, direction, invoiceNo, customerName, total, status: "sent", date });
});

// Reports
router.get("/reports/daily", (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const sales = getDb()
    .prepare(
      `SELECT id FROM sales WHERE branch_id = ? AND ${SQL.date("created_at")}=? AND payment_type != 'refund' ORDER BY created_at DESC`
    )
    .all(req.branchId, date)
    .map((r) => getSaleWithItems(getDb(), r.id));
  res.json(sales);
});

router.get("/reports/historical", (req, res) => {
  const from = req.query.from || new Date().toISOString().slice(0, 8) + "01";
  const to = req.query.to || new Date().toISOString().slice(0, 10);
  const rows = getDb()
    .prepare(`
      SELECT ${SQL.date("created_at")} as date, COUNT(*) as count, SUM(total) as total
      FROM sales WHERE branch_id = ? AND payment_type != 'refund' AND ${SQL.date("created_at")} BETWEEN ? AND ?
      GROUP BY ${SQL.date("created_at")} ORDER BY date DESC
    `)
    .all(req.branchId, from, to);
  res.json(rows.map((r) => ({ id: r.date, date: r.date, count: r.count, total: r.total })));
});

router.get("/reports/products", (req, res) => {
  const db = getDb();
  const sales = db
    .prepare("SELECT id FROM sales WHERE branch_id = ? AND payment_type != 'refund'")
    .all(req.branchId);
  const map = {};
  sales.forEach(({ id }) => {
    getSaleWithItems(db, id).items.forEach((item) => {
      const key = item.productId || item.name;
      if (!map[key]) map[key] = { id: key, name: item.name, qty: 0, total: 0 };
      map[key].qty += item.qty;
      map[key].total += item.qty * item.price;
    });
  });
  res.json(Object.values(map).sort((a, b) => b.total - a.total));
});

router.get("/reports/groups", (req, res) => {
  const state = getAllState(getDb(), req.branchId);
  const groupMap = Object.fromEntries(state.groups.map((g) => [g.id, g.name]));
  const map = {};
  state.sales
    .filter((s) => s.paymentType !== "refund")
    .forEach((sale) => {
      sale.items.forEach((item) => {
        const product = state.products.find((p) => p.id === item.productId);
        const group = groupMap[product?.groupId] || "Diğer";
        if (!map[group]) map[group] = { id: group, group, qty: 0, total: 0 };
        map[group].qty += item.qty;
        map[group].total += item.qty * item.price;
      });
    });
  res.json(Object.values(map).sort((a, b) => b.total - a.total));
});

router.get("/reports/stock", (req, res) => {
  const db = getDb();
  const sold = {};
  db.prepare("SELECT id FROM sales WHERE branch_id = ?").all(req.branchId).forEach(({ id }) => {
    getSaleWithItems(db, id).items.forEach((item) => {
      if (item.productId) sold[item.productId] = (sold[item.productId] || 0) + item.qty;
    });
  });
  res.json(
    getAllState(db, req.branchId).products.map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      sold: sold[p.id] || 0,
      criticalStock: p.criticalStock,
    }))
  );
});

router.get("/reports/staff-motions", (req, res) => {
  res.json(getAllState(getDb(), req.branchId).sales);
});

router.get("/qr-orders", (req, res) => {
  const orders = listQrOrders(getDb(), {
    branchId: req.branchId,
    status: req.query.status || "all",
    limit: Number(req.query.limit) || 50,
  });
  res.json(orders);
});

router.patch("/qr-orders/:id", (req, res) => {
  try {
    const updated = updateQrOrderStatus(getDb(), req.params.id, req.body.status, req.branchId);
    if (!updated) return res.status(404).json({ error: "Sipariş bulunamadı" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
