import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDb, uid, getSaleWithItems } from "../db/index.js";
import { rowToBranch } from "../db/migrate-branches.js";
import { adminMiddleware } from "../middleware/admin.js";
import { seedBranchDefaults } from "../utils/branchDefaults.js";
import { hashBranchPassword, getNextBranchNumber, isValidBranchEmail, normalizeBranchEmail, validateBranchNo } from "../utils/branchAuth.js";
import { signAdminToken } from "../middleware/auth.js";
import { ensureFirmSettings, enrichMenuBranch, rowToFirmMenu } from "../utils/qrMenu.js";
import { listQrOrders, updateQrOrderStatus } from "../utils/qrOrderService.js";
import { saveMenuLogo, deleteMenuLogo } from "../utils/menuLogo.js";
import { normalizeMenuTheme } from "../utils/menuTheme.js";
import { mergeMenuWebConfig, parseMenuWebConfig, serializeMenuWebConfig, applyWebImageUploads } from "../utils/menuWebConfig.js";
import { listActivityLogs, rowToActivityLog } from "../utils/activityLog.js";
import { sql as SQL } from "../db/dialect.js";

const router = Router();
router.use(adminMiddleware);

function getBranchOr404(db, id, firmId) {
  return db.prepare("SELECT * FROM branches WHERE id = ? AND firm_id = ?").get(id, firmId);
}

function branchStats(db, branchId) {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const todayRow = db
    .prepare(
      `SELECT COUNT(*) as c, COALESCE(SUM(total),0) as t FROM sales WHERE branch_id = ? AND ${SQL.date("created_at")}=? AND payment_type != 'refund'`
    )
    .get(branchId, today);
  const monthRow = db
    .prepare(
      `SELECT COUNT(*) as c, COALESCE(SUM(total),0) as t FROM sales WHERE branch_id = ? AND ${SQL.month("created_at")}=? AND payment_type != 'refund'`
    )
    .get(branchId, month);
  return {
    productCount: Number(db.prepare("SELECT COUNT(*) as c FROM products WHERE branch_id = ?").get(branchId).c),
    customerCount: Number(db.prepare("SELECT COUNT(*) as c FROM customers WHERE branch_id = ?").get(branchId).c),
    saleCount: Number(db.prepare("SELECT COUNT(*) as c FROM sales WHERE branch_id = ? AND payment_type != 'refund'").get(branchId).c),
    totalDebt: db.prepare("SELECT COALESCE(SUM(debt),0) as t FROM customers WHERE branch_id = ?").get(branchId).t,
    todayCount: Number(todayRow.c),
    todayTotal: todayRow.t,
    monthCount: Number(monthRow.c),
    monthTotal: monthRow.t,
  };
}

router.get("/summary", (req, res) => {
  const db = getDb();
  const firmId = req.user.firmId;
  const branchCount = db.prepare("SELECT COUNT(*) as c FROM branches WHERE firm_id = ? AND active = 1").get(firmId).c;
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE firm_id = ?").get(firmId).c;
  const branches = db
    .prepare(
      `SELECT b.*,
        (SELECT COUNT(*) FROM products p WHERE p.branch_id = b.id) as product_count,
        (SELECT COUNT(*) FROM sales s WHERE s.branch_id = b.id) as sale_count
       FROM branches b WHERE b.firm_id = ? ORDER BY ${SQL.branchOrder()}, b.name`
    )
    .all(firmId);

  res.json({
    firmId,
    firmName: req.user.firmName,
    branchCount,
    userCount,
    branches: branches.map((b) => ({
      ...rowToBranch(b),
      productCount: b.product_count,
      saleCount: b.sale_count,
    })),
  });
});

router.get("/branches", (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM branches WHERE firm_id = ? ORDER BY ${SQL.branchOrder()}, name`)
    .all(req.user.firmId);
  res.json(
    rows.map((row) => ({
      ...rowToBranch(row),
      stats: branchStats(db, row.id),
    }))
  );
});

router.get("/branches/:id", (req, res) => {
  const db = getDb();
  const branch = getBranchOr404(db, req.params.id, req.user.firmId);
  if (!branch) return res.status(404).json({ error: "Şube bulunamadı" });
  res.json({
    ...rowToBranch(branch),
    stats: branchStats(db, branch.id),
  });
});

router.get("/branches/:id/activity", (req, res) => {
  const db = getDb();
  const branch = getBranchOr404(db, req.params.id, req.user.firmId);
  if (!branch) return res.status(404).json({ error: "Şube bulunamadı" });

  const saleIds = db
    .prepare("SELECT id FROM sales WHERE branch_id = ? ORDER BY created_at DESC LIMIT 30")
    .all(branch.id);
  const sales = saleIds.map(({ id }) => {
    const sale = getSaleWithItems(db, id);
    return {
      id: sale.id,
      code: sale.code,
      createdAt: sale.createdAt,
      paymentType: sale.paymentType,
      total: sale.total,
      itemCount: sale.items.length,
      staffName: sale.staffName,
    };
  });

  const stockCounts = db
    .prepare("SELECT * FROM stock_counts WHERE branch_id = ? ORDER BY date DESC LIMIT 15")
    .all(branch.id)
    .map((r) => ({
      id: r.id,
      productName: r.product_name,
      previous: r.previous_stock,
      counted: r.counted,
      difference: r.difference,
      date: r.date,
    }));

  const topProducts = db
    .prepare(
      `SELECT p.name, p.stock, p.price1 FROM products p
       WHERE p.branch_id = ? ORDER BY p.stock DESC LIMIT 8`
    )
    .all(branch.id);

  res.json({
    branch: rowToBranch(branch),
    stats: branchStats(db, branch.id),
    sales,
    stockCounts,
    topProducts: topProducts.map((p) => ({
      name: p.name,
      stock: p.stock,
      price: p.price1,
    })),
  });
});

router.post("/branches/:id/enter", (req, res) => {
  const db = getDb();
  const branch = getBranchOr404(db, req.params.id, req.user.firmId);
  if (!branch) return res.status(404).json({ error: "Şube bulunamadı" });
  if (!branch.active) return res.status(400).json({ error: "Pasif şubeye giriş yapılamaz" });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  const token = signAdminToken(user, branch.id, branch.name, { impersonating: true });

  res.json({
    token,
    user: {
      email: user.email,
      firmId: user.firm_id,
      firmName: user.firm_name,
      branchId: branch.id,
      branchName: branch.name,
      branchNo: branch.code ? String(parseInt(branch.code, 10) || branch.code) : "",
      branchEmail: branch.email,
      role: "admin",
      loginType: "admin",
      impersonating: true,
      branches: [rowToBranch(branch)],
    },
  });
});

router.post("/branches", (req, res) => {
  const db = getDb();
  const { name, email, password, address } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: "Şube adı zorunludur" });
  }
  if (!email?.trim()) {
    return res.status(400).json({ error: "Şube e-postası zorunludur" });
  }
  if (!isValidBranchEmail(email)) {
    return res.status(400).json({ error: "Geçerli bir e-posta girin" });
  }
  if (!password?.trim()) {
    return res.status(400).json({ error: "Şube parolası zorunludur" });
  }

  const normalizedEmail = normalizeBranchEmail(email);
  const emailTaken = db.prepare("SELECT id FROM branches WHERE email = ?").get(normalizedEmail);
  if (emailTaken) {
    return res.status(400).json({ error: "Bu e-posta zaten kullanılıyor" });
  }

  const id = uid("br");
  const branchNo = getNextBranchNumber(db, req.user.firmId);
  const passwordHash = hashBranchPassword(password);

  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO branches (id, firm_id, name, code, email, password_hash, address, active, menu_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)"
    ).run(id, req.user.firmId, name.trim(), branchNo, normalizedEmail, passwordHash, address?.trim() || "");
    seedBranchDefaults(db, id);
  });

  tx();
  ensureFirmSettings(db, req.user.firmId, req.user.firmName);
  res.status(201).json(rowToBranch(db.prepare("SELECT * FROM branches WHERE id = ?").get(id)));
});

router.patch("/branches/:id", (req, res) => {
  const db = getDb();
  const existing = getBranchOr404(db, req.params.id, req.user.firmId);
  if (!existing) return res.status(404).json({ error: "Şube bulunamadı" });

  const { name, email, address, active, password, branchNo, menuLat, menuLng, lat, lng } = req.body;
  const nextEmail = email?.trim() ? normalizeBranchEmail(email) : existing.email;
  if (email?.trim() && !isValidBranchEmail(nextEmail)) {
    return res.status(400).json({ error: "Geçerli bir e-posta girin" });
  }
  if (nextEmail !== existing.email) {
    const taken = db.prepare("SELECT id FROM branches WHERE email = ? AND id != ?").get(nextEmail, req.params.id);
    if (taken) return res.status(400).json({ error: "Bu e-posta zaten kullanılıyor" });
  }

  const nextPasswordHash = password?.trim() ? hashBranchPassword(password) : existing.password_hash;

  let nextCode = existing.code;
  if (branchNo !== undefined && branchNo !== null && String(branchNo).trim() !== "") {
    const check = validateBranchNo(db, req.user.firmId, branchNo, req.params.id);
    if (check.error) return res.status(400).json({ error: check.error });
    nextCode = check.value;
  }

  const parseCoordInput = (value) => {
    if (value === undefined) return undefined;
    if (value === "" || value === null) return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return NaN;
    return n;
  };

  let nextLat = existing.menu_lat;
  let nextLng = existing.menu_lng;
  if (menuLat !== undefined || lat !== undefined) {
    const parsed = parseCoordInput(menuLat ?? lat);
    if (Number.isNaN(parsed)) return res.status(400).json({ error: "Geçersiz enlem (lat)" });
    if (parsed !== undefined) nextLat = parsed;
  }
  if (menuLng !== undefined || lng !== undefined) {
    const parsed = parseCoordInput(menuLng ?? lng);
    if (Number.isNaN(parsed)) return res.status(400).json({ error: "Geçersiz boylam (lng)" });
    if (parsed !== undefined) nextLng = parsed;
  }

  db.prepare(
    "UPDATE branches SET name=?, code=?, email=?, password_hash=?, address=?, menu_lat=?, menu_lng=?, active=? WHERE id=?"
  ).run(
    name ?? existing.name,
    nextCode,
    nextEmail,
    nextPasswordHash,
    address ?? existing.address,
    nextLat,
    nextLng,
    active === false ? 0 : active === true ? 1 : existing.active,
    req.params.id
  );

  res.json(rowToBranch(db.prepare("SELECT * FROM branches WHERE id = ?").get(req.params.id)));
});

router.delete("/branches/:id", (req, res) => {
  const db = getDb();
  const existing = getBranchOr404(db, req.params.id, req.user.firmId);
  if (!existing) return res.status(404).json({ error: "Şube bulunamadı" });

  const activeCount = db
    .prepare("SELECT COUNT(*) as c FROM branches WHERE firm_id = ? AND active = 1")
    .get(req.user.firmId).c;
  if (activeCount <= 1 && existing.active) {
    return res.status(400).json({ error: "Son aktif şube silinemez" });
  }

  const branchId = req.params.id;
  const branchTables = [
    "products",
    "customers",
    "staff",
    "firms",
    "payment_methods",
    "income_types",
    "expense_types",
    "income_entries",
    "expense_entries",
    "stock_counts",
    "purchase_invoices",
    "refund_requests",
    "tasks",
    "notices",
    "integrations",
    "variants",
    "sub_products",
    "e_invoices",
    "qr_orders",
    "groups",
  ];

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE branch_id = ?)").run(branchId);
    db.prepare("DELETE FROM sales WHERE branch_id = ?").run(branchId);
    branchTables.forEach((table) => {
      try {
        db.prepare(`DELETE FROM ${table} WHERE branch_id = ?`).run(branchId);
      } catch {
        /* table may not exist in older installs */
      }
    });
    db.prepare("UPDATE users SET branch_id = NULL WHERE branch_id = ?").run(branchId);
    db.prepare("DELETE FROM branches WHERE id = ? AND firm_id = ?").run(branchId, req.user.firmId);
  });

  tx();
  res.json({ ok: true, message: "Şube tamamen silindi." });
});

router.get("/qr-menu", (req, res) => {
  const db = getDb();
  const firmRow = ensureFirmSettings(db, req.user.firmId, req.user.firmName);
  const rows = db
    .prepare(`SELECT * FROM branches WHERE firm_id = ? ORDER BY ${SQL.branchOrder()}, name`)
    .all(req.user.firmId);

  const branches = rows.map((row) => {
    const menu = enrichMenuBranch(row, firmRow);
    const pending = db
      .prepare("SELECT COUNT(*) as c FROM qr_orders WHERE branch_id = ? AND status = 'pending'")
      .get(row.id).c;
    return { ...menu, pendingOrders: pending };
  });

  res.json({
    firm: rowToFirmMenu(firmRow, req.user.firmName),
    branches,
  });
});

router.patch("/qr-menu", (req, res) => {
  const db = getDb();
  const firmRow = ensureFirmSettings(db, req.user.firmId, req.user.firmName);
  const {
    menuEnabled,
    menuTitle,
    menuWelcome,
    socialInstagram,
    socialWhatsapp,
    socialTiktok,
    socialFacebook,
    menuDefaultLang,
    menuOpenTime,
    menuCloseTime,
    logoData,
    logoMime,
    removeLogo,
    menuTheme,
    webConfig,
    webImageUploads,
  } = req.body;

  const lang = menuDefaultLang === "tr" ? "tr" : menuDefaultLang === "az" ? "az" : firmRow.menu_default_lang || "az";
  const theme = menuTheme != null ? normalizeMenuTheme(menuTheme, firmRow.menu_theme) : firmRow.menu_theme || "classic";

  let logoPath = firmRow.menu_logo_path;
  if (removeLogo) {
    deleteMenuLogo(req.user.firmId);
    logoPath = null;
  } else if (logoData && logoMime) {
    logoPath = saveMenuLogo(req.user.firmId, logoData, logoMime);
  }

  let nextWebConfig = webConfig != null
    ? mergeMenuWebConfig(firmRow.menu_web_config, webConfig)
    : parseMenuWebConfig(firmRow.menu_web_config);

  if (webImageUploads && Object.keys(webImageUploads).length > 0) {
    nextWebConfig = applyWebImageUploads(req.user.firmId, nextWebConfig, webImageUploads);
  }

  db.prepare(
    `UPDATE firm_settings SET
      menu_enabled = ?,
      menu_title = ?,
      menu_welcome = ?,
      menu_social_instagram = ?,
      menu_social_whatsapp = ?,
      menu_social_tiktok = ?,
      menu_social_facebook = ?,
      menu_default_lang = ?,
      menu_open_time = ?,
      menu_close_time = ?,
      menu_logo_path = ?,
      menu_theme = ?,
      menu_web_config = ?
     WHERE firm_id = ?`
  ).run(
    menuEnabled === false ? 0 : 1,
    menuTitle ?? firmRow.menu_title ?? req.user.firmName,
    menuWelcome ?? firmRow.menu_welcome ?? "",
    socialInstagram ?? firmRow.menu_social_instagram ?? "",
    socialWhatsapp ?? firmRow.menu_social_whatsapp ?? "",
    socialTiktok ?? firmRow.menu_social_tiktok ?? "",
    socialFacebook ?? firmRow.menu_social_facebook ?? "",
    lang,
    menuOpenTime ?? firmRow.menu_open_time ?? "09:00",
    menuCloseTime ?? firmRow.menu_close_time ?? "23:00",
    logoPath,
    theme,
    serializeMenuWebConfig(nextWebConfig),
    req.user.firmId
  );

  if (menuEnabled !== false) {
    db.prepare("UPDATE branches SET menu_enabled = 1 WHERE firm_id = ? AND active = 1").run(req.user.firmId);
  }

  res.json({
    firm: rowToFirmMenu(db.prepare("SELECT * FROM firm_settings WHERE firm_id = ?").get(req.user.firmId), req.user.firmName),
  });
});

router.patch("/qr-menu/branches/:id", (req, res) => {
  const db = getDb();
  const existing = getBranchOr404(db, req.params.id, req.user.firmId);
  if (!existing) return res.status(404).json({ error: "Şube bulunamadı" });

  const branch = db.prepare("SELECT * FROM branches WHERE id = ?").get(req.params.id);

  const { menuEnabled, menuAcceptOrders, menuLat, menuLng, menuOpenTime, menuCloseTime } = req.body;
  db.prepare(
    `UPDATE branches SET
      menu_enabled = ?,
      menu_accept_orders = ?,
      menu_lat = ?,
      menu_lng = ?,
      menu_open_time = ?,
      menu_close_time = ?
     WHERE id = ?`
  ).run(
    menuEnabled === true ? 1 : menuEnabled === false ? 0 : branch.menu_enabled,
    menuAcceptOrders === false ? 0 : menuAcceptOrders === true ? 1 : branch.menu_accept_orders,
    menuLat === null || menuLat === "" ? null : Number(menuLat),
    menuLng === null || menuLng === "" ? null : Number(menuLng),
    menuOpenTime?.trim() || null,
    menuCloseTime?.trim() || null,
    req.params.id
  );

  const firmRow = ensureFirmSettings(db, req.user.firmId, req.user.firmName);
  res.json(enrichMenuBranch(db.prepare("SELECT * FROM branches WHERE id = ?").get(req.params.id), firmRow));
});

router.get("/qr-orders", (req, res) => {
  const db = getDb();
  const orders = listQrOrders(db, {
    firmId: req.user.firmId,
    branchId: req.query.branchId || null,
    status: req.query.status || "all",
    limit: Number(req.query.limit) || 100,
  });
  res.json(orders);
});

router.patch("/qr-orders/:id", (req, res) => {
  const db = getDb();
  const order = db
    .prepare(
      `SELECT o.* FROM qr_orders o
       JOIN branches b ON b.id = o.branch_id
       WHERE o.id = ? AND b.firm_id = ?`
    )
    .get(req.params.id, req.user.firmId);
  if (!order) return res.status(404).json({ error: "Sipariş bulunamadı" });

  try {
    const updated = updateQrOrderStatus(db, req.params.id, req.body.status, order.branch_id);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/activity", (req, res) => {
  const db = getDb();
  const limit = Number(req.query.limit) || 80;
  const rows = listActivityLogs(db, req.user.firmId, { limit });
  res.json(rows.map(rowToActivityLog));
});

router.get("/activity/poll", (req, res) => {
  const db = getDb();
  const after = req.query.after || null;
  const rows = listActivityLogs(db, req.user.firmId, { limit: 30, after });
  const pendingQrOrders = db
    .prepare(
      `SELECT COUNT(*) as c FROM qr_orders o
       JOIN branches b ON b.id = o.branch_id
       WHERE b.firm_id = ? AND o.status = 'pending'`
    )
    .get(req.user.firmId).c;

  res.json({
    events: rows.map(rowToActivityLog),
    pendingQrOrders: Number(pendingQrOrders) || 0,
  });
});

router.patch("/account/password", (req, res) => {
  req.body = {
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
  };
  return updateAdminAccount(req, res);
});

router.patch("/account", (req, res) => updateAdminAccount(req, res));

function updateAdminAccount(req, res) {
  const db = getDb();
  const { currentPassword, newEmail, newPassword } = req.body;

  if (!currentPassword) {
    return res.status(400).json({ error: "Mevcut şifre gerekli" });
  }

  const nextEmailRaw = typeof newEmail === "string" ? newEmail.trim().toLowerCase() : "";
  const nextPasswordRaw = typeof newPassword === "string" ? newPassword : "";

  if (!nextEmailRaw && !nextPasswordRaw) {
    return res.status(400).json({ error: "Yeni e-posta veya şifre girin" });
  }
  if (nextPasswordRaw && nextPasswordRaw.length < 6) {
    return res.status(400).json({ error: "Yeni şifre en az 6 karakter olmalı" });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ? AND firm_id = ?").get(req.user.id, req.user.firmId);
  if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: "Mevcut şifre hatalı" });
  }

  let email = user.email;
  if (nextEmailRaw) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmailRaw)) {
      return res.status(400).json({ error: "Geçerli bir e-posta girin" });
    }
    const taken = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(nextEmailRaw, user.id);
    if (taken) {
      return res.status(409).json({ error: "Bu e-posta zaten kullanılıyor" });
    }
    email = nextEmailRaw;
  }

  let passwordHash = user.password_hash;
  if (nextPasswordRaw) {
    passwordHash = bcrypt.hashSync(nextPasswordRaw, 10);
  }

  db.prepare("UPDATE users SET email = ?, password_hash = ? WHERE id = ?").run(email, passwordHash, user.id);

  res.json({
    ok: true,
    email,
    message: "Admin giriş bilgileri güncellendi",
  });
}

export default router;
