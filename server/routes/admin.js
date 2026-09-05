import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDb, uid, getSaleWithItems } from "../db/index.js";
import { rowToBranch } from "../db/migrate-branches.js";
import { adminMiddleware } from "../middleware/admin.js";
import { seedBranchDefaults } from "../utils/branchDefaults.js";
import {
  generateFirmBarcode,
  generateFirmStockCode,
  listFirmGroups,
  listFirmProducts,
  rowToFirmGroup,
  rowToFirmProduct,
  syncFirmCatalogToBranch,
  syncFirmGroupToAllBranches,
  syncFirmProductToAllBranches,
  deactivateFirmProduct,
  removeFirmGroup,
  applyCatalogImageAndSync,
  clearCatalogImageAndSync,
} from "../utils/firmCatalog.js";
import {
  saveCatalogImage,
  saveCatalogImageFromFile,
  resolveCatalogImageFile,
  contentTypeForImagePath,
  deleteCatalogImage,
} from "../utils/catalogImage.js";
import { catalogImageUpload } from "../middleware/imageUpload.js";
import { hashBranchPassword, getNextBranchNumber, isValidBranchEmail, normalizeBranchEmail, validateBranchNo } from "../utils/branchAuth.js";
import { signAdminToken } from "../middleware/auth.js";
import { ensureFirmSettings, enrichMenuBranch, rowToFirmMenu } from "../utils/qrMenu.js";
import { listQrOrders, updateQrOrderStatus } from "../utils/qrOrderService.js";
import { saveMenuLogo, deleteMenuLogo } from "../utils/menuLogo.js";
import { normalizeMenuTheme } from "../utils/menuTheme.js";
import { mergeMenuWebConfig, parseMenuWebConfig, serializeMenuWebConfig, applyWebImageUploads } from "../utils/menuWebConfig.js";
import { listActivityLogs, rowToActivityLog } from "../utils/activityLog.js";
import { normalizeTime } from "../utils/businessHours.js";
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

  const mapped = branches.map((b) => {
    const stats = branchStats(db, b.id);
    return {
      ...rowToBranch(b),
      productCount: Number(b.product_count),
      saleCount: Number(b.sale_count),
      stats,
    };
  });

  const totals = mapped.reduce(
    (acc, b) => {
      acc.todayCount += Number(b.stats?.todayCount || 0);
      acc.todayTotal += Number(b.stats?.todayTotal || 0);
      acc.monthCount += Number(b.stats?.monthCount || 0);
      acc.monthTotal += Number(b.stats?.monthTotal || 0);
      acc.productCount += Number(b.productCount || 0);
      acc.customerCount += Number(b.stats?.customerCount || 0);
      return acc;
    },
    { todayCount: 0, todayTotal: 0, monthCount: 0, monthTotal: 0, productCount: 0, customerCount: 0 }
  );

  let pendingQrOrders = 0;
  try {
    pendingQrOrders = Number(
      db
        .prepare(
          `SELECT COUNT(*) as c FROM qr_orders qo
           INNER JOIN branches b ON b.id = qo.branch_id
           WHERE b.firm_id = ? AND qo.status = 'pending'`
        )
        .get(firmId).c
    );
  } catch {
    pendingQrOrders = 0;
  }

  const recentActivity = listActivityLogs(db, firmId, { limit: 8 }).map(rowToActivityLog);

  res.json({
    firmId,
    firmName: req.user.firmName,
    branchCount,
    userCount,
    ...totals,
    pendingQrOrders,
    recentActivity,
    branches: mapped,
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

function staffSalesTotals(db, branchId, staff) {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const fullName = `${staff.name || ""} ${staff.surname || ""}`.trim();
  const names = [...new Set([fullName, staff.name].filter(Boolean))];
  if (!names.length) {
    return { todayTotal: 0, todayCount: 0, monthTotal: 0, monthCount: 0 };
  }
  const placeholders = names.map(() => "?").join(", ");
  const todayRow = db
    .prepare(
      `SELECT COALESCE(SUM(total),0) as t, COUNT(*) as c FROM sales
       WHERE branch_id = ? AND ${SQL.date("created_at")}=? AND payment_type != 'refund'
         AND staff_name IN (${placeholders})`
    )
    .get(branchId, today, ...names);
  const monthRow = db
    .prepare(
      `SELECT COALESCE(SUM(total),0) as t, COUNT(*) as c FROM sales
       WHERE branch_id = ? AND ${SQL.month("created_at")}=? AND payment_type != 'refund'
         AND staff_name IN (${placeholders})`
    )
    .get(branchId, month, ...names);
  return {
    todayTotal: Number(todayRow?.t || 0),
    todayCount: Number(todayRow?.c || 0),
    monthTotal: Number(monthRow?.t || 0),
    monthCount: Number(monthRow?.c || 0),
  };
}

router.get("/branches/:id/workspace", (req, res) => {
  const db = getDb();
  const branch = getBranchOr404(db, req.params.id, req.user.firmId);
  if (!branch) return res.status(404).json({ error: "Şube bulunamadı" });

  const products = db
    .prepare(
      `SELECT p.*, g.name as group_name FROM products p
       LEFT JOIN \`groups\` g ON g.id = p.group_id
       WHERE p.branch_id = ? ORDER BY p.name`
    )
    .all(branch.id)
    .map((p) => ({
      id: p.id,
      name: p.name,
      groupName: p.group_name || "",
      stock: Number(p.stock || 0),
      criticalStock: Number(p.critical_stock || 0),
      price1: Number(p.price1 || 0),
      buyPrice: Number(p.buy_price || 0),
      active: !!p.active,
      firmProductId: p.firm_product_id || null,
    }));

  const saleIds = db
    .prepare("SELECT id FROM sales WHERE branch_id = ? ORDER BY created_at DESC LIMIT 40")
    .all(branch.id);
  const sales = saleIds.map(({ id }) => {
    const sale = getSaleWithItems(db, id);
    return {
      id: sale.id,
      code: sale.code,
      createdAt: sale.createdAt,
      paymentType: sale.paymentType,
      total: sale.total,
      cashAmount: sale.cashAmount,
      posAmount: sale.posAmount,
      staffName: sale.staffName,
      itemCount: sale.items.length,
      items: sale.items,
    };
  });

  const withdrawals = db
    .prepare("SELECT * FROM cash_withdrawals WHERE branch_id = ? ORDER BY created_at DESC LIMIT 50")
    .all(branch.id)
    .map((row) => ({
      id: row.id,
      amount: Number(row.amount || 0),
      reason: row.reason,
      note: row.note || "",
      staffName: row.staff_name,
      createdAt: row.created_at,
    }));

  const staff = db
    .prepare("SELECT * FROM staff WHERE branch_id = ? ORDER BY name")
    .all(branch.id)
    .map((row) => ({
      id: row.id,
      name: row.name,
      surname: row.surname || "",
      role: row.role || "",
      active: !!row.active,
      salary: Number(row.salary || 0),
      phone: row.phone || "",
      startedAt: row.started_at || "",
      ...staffSalesTotals(db, branch.id, row),
    }));

  const pay = db
    .prepare(
      `SELECT payment_type, COUNT(*) as c, COALESCE(SUM(total),0) as t
       FROM sales WHERE branch_id = ? GROUP BY payment_type`
    )
    .all(branch.id);
  const payMap = Object.fromEntries(pay.map((r) => [r.payment_type, { count: Number(r.c), total: Number(r.t) }]));

  const sold = db
    .prepare(
      `SELECT COALESCE(SUM(si.qty),0) as qty, COALESCE(SUM(si.qty * si.price),0) as sold,
              COALESCE(SUM(si.qty * COALESCE(p.buy_price,0)),0) as cost
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       LEFT JOIN products p ON p.id = si.product_id
       WHERE s.branch_id = ? AND s.payment_type != 'refund'`
    )
    .get(branch.id);

  const refunds = db
    .prepare(
      `SELECT COUNT(*) as c, COALESCE(SUM(total),0) as t FROM sales
       WHERE branch_id = ? AND payment_type = 'refund'`
    )
    .get(branch.id);

  const refundRequests = db
    .prepare("SELECT * FROM refund_requests WHERE branch_id = ? ORDER BY date DESC LIMIT 20")
    .all(branch.id)
    .map((r) => ({
      id: r.id,
      productName: r.product_name || "",
      reason: r.reason || "",
      status: r.status,
      date: r.date,
    }));

  res.json({
    products,
    sales,
    withdrawals,
    staff,
    refundRequests,
    report: {
      cash: payMap.cash || { count: 0, total: 0 },
      pos: payMap.pos || { count: 0, total: 0 },
      open: payMap.open || { count: 0, total: 0 },
      partial: payMap.partial || { count: 0, total: 0 },
      refund: { count: Number(refunds?.c || 0), total: Number(refunds?.t || 0) },
      soldQty: Number(sold?.qty || 0),
      soldAmount: Number(sold?.sold || 0),
      costAmount: Number(sold?.cost || 0),
      profit: Number(sold?.sold || 0) - Number(sold?.cost || 0),
      withdrawalTotal: withdrawals.reduce((sum, row) => sum + row.amount, 0),
    },
  });
});

router.patch("/branches/:id/products/:productId", (req, res) => {
  const db = getDb();
  const branch = getBranchOr404(db, req.params.id, req.user.firmId);
  if (!branch) return res.status(404).json({ error: "Şube bulunamadı" });
  const product = db
    .prepare("SELECT * FROM products WHERE id = ? AND branch_id = ?")
    .get(req.params.productId, branch.id);
  if (!product) return res.status(404).json({ error: "Ürün bulunamadı" });

  const nextPrice = req.body.price1 != null ? Number(req.body.price1) : Number(product.price1 || 0);
  if (Number.isNaN(nextPrice) || nextPrice < 0) {
    return res.status(400).json({ error: "Geçerli fiyat girin" });
  }
  let nextStock = Number(product.stock || 0);
  if (req.body.addStock != null) {
    const add = Number(req.body.addStock);
    if (Number.isNaN(add)) return res.status(400).json({ error: "Geçerli stok girin" });
    nextStock += add;
  } else if (req.body.stock != null) {
    nextStock = Number(req.body.stock);
    if (Number.isNaN(nextStock)) return res.status(400).json({ error: "Geçerli stok girin" });
  }
  db.prepare("UPDATE products SET price1 = ?, stock = ? WHERE id = ? AND branch_id = ?").run(
    nextPrice,
    nextStock,
    product.id,
    branch.id
  );
  const updated = db.prepare("SELECT * FROM products WHERE id = ?").get(product.id);
  res.json({
    id: updated.id,
    name: updated.name,
    stock: Number(updated.stock || 0),
    price1: Number(updated.price1 || 0),
  });
});

router.patch("/branches/:id/staff/:staffId", (req, res) => {
  const db = getDb();
  const branch = getBranchOr404(db, req.params.id, req.user.firmId);
  if (!branch) return res.status(404).json({ error: "Şube bulunamadı" });
  const staff = db.prepare("SELECT * FROM staff WHERE id = ? AND branch_id = ?").get(req.params.staffId, branch.id);
  if (!staff) return res.status(404).json({ error: "Çalışan bulunamadı" });
  const salary = Number(req.body.salary);
  if (Number.isNaN(salary) || salary < 0) return res.status(400).json({ error: "Geçerli maaş girin" });
  db.prepare("UPDATE staff SET salary = ? WHERE id = ?").run(salary, staff.id);
  res.json({ id: staff.id, salary });
});

function normalizeStaffRole(role) {
  const value = String(role || "").toLocaleLowerCase("tr");
  if (value.includes("garson")) return "Garson";
  if (value.includes("personal") || value.includes("personel")) return "Personal";
  return "Kasiyer";
}

function rowToAdminStaff(row, branch) {
  return {
    id: row.id,
    name: row.name,
    surname: row.surname || "",
    phone: row.phone || "",
    login: row.login || "",
    role: row.role || "Kasiyer",
    salary: Number(row.salary || 0),
    startedAt: row.started_at || "",
    active: !!row.active,
    branchId: row.branch_id,
    branchName: branch ? branch.name : "",
    hasPassword: !!row.password_hash,
  };
}

router.get("/staff", (req, res) => {
  const db = getDb();
  const branches = db.prepare("SELECT * FROM branches WHERE firm_id = ?").all(req.user.firmId);
  const branchMap = Object.fromEntries(branches.map((b) => [b.id, b]));
  const rows = db.prepare("SELECT * FROM staff ORDER BY name").all();
  res.json(
    rows.filter((row) => branchMap[row.branch_id]).map((row) => rowToAdminStaff(row, branchMap[row.branch_id]))
  );
});

router.post("/staff", (req, res) => {
  const db = getDb();
  const { name, surname, phone, branchId, login, password, role, salary, startedAt } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Ad zorunludur" });
  if (!branchId) return res.status(400).json({ error: "Şube seçin" });
  if (!login?.trim()) return res.status(400).json({ error: "Login zorunludur" });
  if (!password?.trim()) return res.status(400).json({ error: "Parola zorunludur" });
  const branch = getBranchOr404(db, branchId, req.user.firmId);
  if (!branch) return res.status(404).json({ error: "Şube bulunamadı" });
  const normalizedLogin = login.trim().toLowerCase();
  const taken = db.prepare("SELECT id FROM staff WHERE login = ?").get(normalizedLogin);
  if (taken) return res.status(409).json({ error: "Bu login zaten kullanılıyor" });
  const nextRole = normalizeStaffRole(role);
  const canCash = nextRole === "Kasiyer" ? 1 : 0;
  const id = uid("s");
  db.prepare(
    `INSERT INTO staff (id, name, surname, login, password_hash, code, role, active, can_cash_expense, branch_id, salary, phone, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`
  ).run(
    id,
    name.trim(),
    surname?.trim() || "",
    normalizedLogin,
    hashBranchPassword(password),
    "",
    nextRole,
    canCash,
    branch.id,
    Number(salary) || 0,
    phone?.trim() || "",
    startedAt?.trim() || ""
  );
  const row = db.prepare("SELECT * FROM staff WHERE id = ?").get(id);
  res.status(201).json(rowToAdminStaff(row, branch));
});

router.patch("/staff/:id", (req, res) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM staff WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Çalışan bulunamadı" });
  const currentBranch = getBranchOr404(db, existing.branch_id, req.user.firmId);
  if (!currentBranch) return res.status(404).json({ error: "Çalışan bulunamadı" });
  const s = req.body;
  let nextBranch = currentBranch;
  if (s.branchId && s.branchId !== existing.branch_id) {
    nextBranch = getBranchOr404(db, s.branchId, req.user.firmId);
    if (!nextBranch) return res.status(404).json({ error: "Şube bulunamadı" });
  }
  const nextLogin = s.login !== undefined ? String(s.login).trim().toLowerCase() : existing.login;
  if (nextLogin && nextLogin !== existing.login) {
    const taken = db.prepare("SELECT id FROM staff WHERE login = ? AND id != ?").get(nextLogin, existing.id);
    if (taken) return res.status(409).json({ error: "Bu login zaten kullanılıyor" });
  }
  const nextRole = s.role !== undefined ? normalizeStaffRole(s.role) : existing.role || "Kasiyer";
  const passwordHash = s.password?.trim() ? hashBranchPassword(s.password) : existing.password_hash;
  db.prepare(
    `UPDATE staff SET name=?, surname=?, login=?, password_hash=?, role=?, active=?, can_cash_expense=?, branch_id=?, salary=?, phone=?, started_at=?
     WHERE id=?`
  ).run(
    s.name?.trim() || existing.name,
    s.surname !== undefined ? s.surname.trim() : existing.surname || "",
    nextLogin,
    passwordHash,
    nextRole,
    s.active === false ? 0 : s.active === true ? 1 : existing.active ? 1 : 0,
    nextRole === "Kasiyer" ? 1 : 0,
    nextBranch.id,
    s.salary != null ? Number(s.salary) || 0 : Number(existing.salary || 0),
    s.phone !== undefined ? s.phone.trim() : existing.phone || "",
    s.startedAt !== undefined ? s.startedAt : existing.started_at || "",
    existing.id
  );
  const row = db.prepare("SELECT * FROM staff WHERE id = ?").get(existing.id);
  res.json(rowToAdminStaff(row, nextBranch));
});

router.delete("/staff/:id", (req, res) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM staff WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Çalışan bulunamadı" });
  if (!getBranchOr404(db, existing.branch_id, req.user.firmId)) {
    return res.status(404).json({ error: "Çalışan bulunamadı" });
  }
  db.prepare("DELETE FROM staff WHERE id = ?").run(existing.id);
  res.json({ ok: true });
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
    syncFirmCatalogToBranch(db, req.user.firmId, id);
  });

  tx();
  ensureFirmSettings(db, req.user.firmId, req.user.firmName);
  res.status(201).json(rowToBranch(db.prepare("SELECT * FROM branches WHERE id = ?").get(id)));
});

router.patch("/branches/:id", (req, res) => {
  const db = getDb();
  const existing = getBranchOr404(db, req.params.id, req.user.firmId);
  if (!existing) return res.status(404).json({ error: "Şube bulunamadı" });

  const { name, email, address, active, password, branchNo, menuLat, menuLng, lat, lng, businessOpenTime, businessCloseTime } = req.body;
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

  let nextBusinessOpen = existing.business_open_time || "08:00";
  let nextBusinessClose = existing.business_close_time || "17:00";
  if (businessOpenTime !== undefined) nextBusinessOpen = normalizeTime(businessOpenTime, nextBusinessOpen);
  if (businessCloseTime !== undefined) nextBusinessClose = normalizeTime(businessCloseTime, nextBusinessClose);

  db.prepare(
    "UPDATE branches SET name=?, code=?, email=?, password_hash=?, address=?, menu_lat=?, menu_lng=?, business_open_time=?, business_close_time=?, active=? WHERE id=?"
  ).run(
    name ?? existing.name,
    nextCode,
    nextEmail,
    nextPasswordHash,
    address ?? existing.address,
    nextLat,
    nextLng,
    nextBusinessOpen,
    nextBusinessClose,
    active === false ? 0 : active === true ? 1 : existing.active,
    req.params.id
  );

  res.json(rowToBranch(db.prepare("SELECT * FROM branches WHERE id = ?").get(req.params.id)));
});

function rowToCashWithdrawal(row) {
  return {
    id: row.id,
    branchId: row.branch_id,
    staffId: row.staff_id || null,
    staffName: row.staff_name,
    amount: Number(row.amount),
    reason: row.reason,
    note: row.note || "",
    createdAt: row.created_at,
  };
}

function rowToBusinessDayReport(row) {
  let stats = {};
  try {
    stats = JSON.parse(row.stats_json || "{}");
  } catch {
    stats = {};
  }
  return {
    id: row.id,
    branchId: row.branch_id,
    businessDate: row.business_date,
    openTime: row.open_time,
    closeTime: row.close_time,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    openingCash: Number(row.opening_cash || 0),
    closingCash: Number(row.closing_cash || 0),
    stats,
    createdAt: row.created_at,
  };
}

router.get("/cash-withdrawals", (req, res) => {
  const db = getDb();
  const { branchId, from, to, staffId } = req.query;
  let rows = db.prepare("SELECT * FROM cash_withdrawals ORDER BY created_at DESC").all();

  const branchIds = db
    .prepare("SELECT id FROM branches WHERE firm_id = ?")
    .all(req.user.firmId)
    .map((b) => b.id);
  rows = rows.filter((row) => branchIds.includes(row.branch_id));

  if (branchId) rows = rows.filter((row) => row.branch_id === branchId);
  if (staffId) rows = rows.filter((row) => row.staff_id === staffId);
  if (from) rows = rows.filter((row) => row.created_at.slice(0, 10) >= from);
  if (to) rows = rows.filter((row) => row.created_at.slice(0, 10) <= to);

  res.json(rows.map(rowToCashWithdrawal));
});

router.patch("/cash-withdrawals/:id", (req, res) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM cash_withdrawals WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Xərc tapılmadı" });

  const branch = db.prepare("SELECT * FROM branches WHERE id = ? AND firm_id = ?").get(existing.branch_id, req.user.firmId);
  if (!branch) return res.status(404).json({ error: "Xərc tapılmadı" });

  const amount = Number(req.body.amount ?? existing.amount);
  const reason = String(req.body.reason ?? existing.reason).trim();
  const note = String(req.body.note ?? existing.note ?? "").trim();

  if (!amount || amount <= 0) return res.status(400).json({ error: "Geçerli məbləğ girin" });
  if (!reason) return res.status(400).json({ error: "Xərc səbəbi zəruridir" });

  db.prepare("UPDATE cash_withdrawals SET amount = ?, reason = ?, note = ? WHERE id = ?").run(
    amount,
    reason,
    note,
    req.params.id
  );

  res.json(rowToCashWithdrawal(db.prepare("SELECT * FROM cash_withdrawals WHERE id = ?").get(req.params.id)));
});

router.get("/business-day-reports", (req, res) => {
  const db = getDb();
  const { branchId, from, to } = req.query;
  let rows = db.prepare("SELECT * FROM business_day_reports ORDER BY business_date DESC").all();

  const branchIds = db
    .prepare("SELECT id FROM branches WHERE firm_id = ?")
    .all(req.user.firmId)
    .map((b) => b.id);
  rows = rows.filter((row) => branchIds.includes(row.branch_id));

  if (branchId) rows = rows.filter((row) => row.branch_id === branchId);
  if (from) rows = rows.filter((row) => row.business_date >= from);
  if (to) rows = rows.filter((row) => row.business_date <= to);

  res.json(rows.map(rowToBusinessDayReport));
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
    "cash_withdrawals",
    "business_day_reports",
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

router.get("/catalog/groups", (req, res) => {
  res.json(listFirmGroups(getDb(), req.user.firmId));
});

router.post("/catalog/groups", (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Grup adı zorunludur" });
  const db = getDb();
  const exists = db
    .prepare("SELECT id FROM firm_groups WHERE firm_id = ? AND name = ?")
    .get(req.user.firmId, name);
  if (exists) return res.status(409).json({ error: "Bu grup zaten var" });
  const id = uid("fg");
  db.prepare("INSERT INTO firm_groups (id, firm_id, name) VALUES (?, ?, ?)").run(id, req.user.firmId, name);
  const group = { id, name };
  syncFirmGroupToAllBranches(db, req.user.firmId, group);
  res.status(201).json(rowToFirmGroup(group));
});

router.patch("/catalog/groups/:id", (req, res) => {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM firm_groups WHERE id = ? AND firm_id = ?")
    .get(req.params.id, req.user.firmId);
  if (!existing) return res.status(404).json({ error: "Grup bulunamadı" });
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Grup adı zorunludur" });
  db.prepare("UPDATE firm_groups SET name = ? WHERE id = ?").run(name, existing.id);
  syncFirmGroupToAllBranches(db, req.user.firmId, { id: existing.id, name });
  res.json({ id: existing.id, name });
});

router.delete("/catalog/groups/:id", (req, res) => {
  const result = removeFirmGroup(getDb(), req.user.firmId, req.params.id);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});

router.get("/catalog/products", (req, res) => {
  res.json(listFirmProducts(getDb(), req.user.firmId));
});

router.get("/catalog/products/:id/image", (req, res) => {
  const db = getDb();
  const row = db
    .prepare("SELECT image_path FROM firm_products WHERE id = ? AND firm_id = ?")
    .get(req.params.id, req.user.firmId);
  if (!row?.image_path) return res.status(404).end();
  const filePath = resolveCatalogImageFile(req.user.firmId, row.image_path);
  if (!filePath) return res.status(404).end();
  res.setHeader("Content-Type", contentTypeForImagePath(row.image_path));
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.sendFile(filePath);
});

router.post("/catalog/products", (req, res) => {
  const db = getDb();
  const p = req.body;
  const name = String(p.name || "").trim();
  if (!name) return res.status(400).json({ error: "Ürün adı zorunludur" });
  if (!p.groupId) return res.status(400).json({ error: "Grup seçin" });
  const group = db
    .prepare("SELECT * FROM firm_groups WHERE id = ? AND firm_id = ?")
    .get(p.groupId, req.user.firmId);
  if (!group) return res.status(400).json({ error: "Grup bulunamadı" });

  const id = uid("fp");
  const barcode = (p.barcode && String(p.barcode).trim()) || generateFirmBarcode(db, req.user.firmId);
  const stockCode = (p.stockCode && String(p.stockCode).trim()) || generateFirmStockCode(db, req.user.firmId);
  db.prepare(
    `INSERT INTO firm_products (id, firm_id, group_id, barcode, stock_code, name, vat, buy_price, price1, price2, unit, on_sale_page, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  ).run(
    id,
    req.user.firmId,
    p.groupId,
    barcode,
    stockCode,
    name,
    Number(p.vat) || 20,
    Number(p.buyPrice) || 0,
    Number(p.price1) || 0,
    Number(p.price2) || 0,
    p.unit || "Adet",
    p.onSalePage === false ? 0 : 1
  );

  if (p.imageData && p.imageMime) {
    const filename = saveCatalogImage(req.user.firmId, id, p.imageData, p.imageMime);
    db.prepare("UPDATE firm_products SET image_path = ? WHERE id = ?").run(filename, id);
  } else if (p.removeImage) {
    deleteCatalogImage(req.user.firmId, id);
  }

  syncFirmProductToAllBranches(db, req.user.firmId, id);
  const row = db.prepare("SELECT * FROM firm_products WHERE id = ?").get(id);
  res.status(201).json(rowToFirmProduct(row, group.name));
});

router.patch("/catalog/products/:id", (req, res) => {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM firm_products WHERE id = ? AND firm_id = ?")
    .get(req.params.id, req.user.firmId);
  if (!existing) return res.status(404).json({ error: "Ürün bulunamadı" });
  const p = req.body;
  const name = p.name != null ? String(p.name).trim() : existing.name;
  if (!name) return res.status(400).json({ error: "Ürün adı zorunludur" });
  const groupId = p.groupId || existing.group_id;
  const group = db
    .prepare("SELECT * FROM firm_groups WHERE id = ? AND firm_id = ?")
    .get(groupId, req.user.firmId);
  if (!group) return res.status(400).json({ error: "Grup bulunamadı" });

  db.prepare(
    `UPDATE firm_products SET group_id=?, name=?, vat=?, buy_price=?, price1=?, price2=?, unit=?, on_sale_page=?, active=?
     WHERE id=?`
  ).run(
    groupId,
    name,
    p.vat != null ? Number(p.vat) : existing.vat,
    p.buyPrice != null ? Number(p.buyPrice) : existing.buy_price,
    p.price1 != null ? Number(p.price1) : existing.price1,
    p.price2 != null ? Number(p.price2) : existing.price2,
    p.unit || existing.unit || "Adet",
    p.onSalePage === false ? 0 : p.onSalePage === true ? 1 : existing.on_sale_page,
    p.active === false ? 0 : p.active === true ? 1 : existing.active,
    existing.id
  );

  if (p.removeImage) {
    clearCatalogImageAndSync(db, req.user.firmId, existing.id);
  } else if (p.imageData && p.imageMime) {
    const filename = saveCatalogImage(req.user.firmId, existing.id, p.imageData, p.imageMime);
    applyCatalogImageAndSync(db, req.user.firmId, existing.id, filename);
  } else {
    syncFirmProductToAllBranches(db, req.user.firmId, existing.id);
  }

  const row = db.prepare("SELECT * FROM firm_products WHERE id = ?").get(existing.id);
  res.json(rowToFirmProduct(row, group.name));
});

router.post("/catalog/products/:id/image-file", (req, res) => {
  catalogImageUpload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || "Resim yüklenemedi" });
    const db = getDb();
    const existing = db
      .prepare("SELECT * FROM firm_products WHERE id = ? AND firm_id = ?")
      .get(req.params.id, req.user.firmId);
    if (!existing) return res.status(404).json({ error: "Ürün bulunamadı" });
    if (!req.file) return res.status(400).json({ error: "Resim dosyası gerekli" });
    try {
      const filename = saveCatalogImageFromFile(req.user.firmId, existing.id, req.file.path, req.file.mimetype);
      applyCatalogImageAndSync(db, req.user.firmId, existing.id, filename);
      const row = db.prepare("SELECT * FROM firm_products WHERE id = ?").get(existing.id);
      const group = row.group_id
        ? db.prepare("SELECT name FROM firm_groups WHERE id = ?").get(row.group_id)
        : null;
      res.json(rowToFirmProduct(row, group?.name || ""));
    } catch (saveErr) {
      return res.status(400).json({ error: saveErr.message || "Resim kaydedilemedi" });
    }
  });
});

router.delete("/catalog/products/:id", (req, res) => {
  deactivateFirmProduct(getDb(), req.user.firmId, req.params.id);
  res.json({ ok: true });
});

export default router;
