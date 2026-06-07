import { Router } from "express";
import { getDb, uid, getSaleWithItems } from "../db/index.js";
import { rowToBranch } from "../db/migrate-branches.js";
import { adminMiddleware } from "../middleware/admin.js";
import { seedBranchDefaults } from "../utils/branchDefaults.js";
import { hashBranchPassword, getNextBranchNumber, isValidBranchEmail, normalizeBranchEmail } from "../utils/branchAuth.js";
import { signAdminToken } from "../middleware/auth.js";
import { ensureFirmSettings, rowToMenuBranch, rowToFirmMenu } from "../utils/qrMenu.js";
import { listQrOrders, updateQrOrderStatus } from "../utils/qrOrderService.js";

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
      "SELECT COUNT(*) as c, COALESCE(SUM(total),0) as t FROM sales WHERE branch_id = ? AND date(created_at)=? AND payment_type != 'refund'"
    )
    .get(branchId, today);
  const monthRow = db
    .prepare(
      "SELECT COUNT(*) as c, COALESCE(SUM(total),0) as t FROM sales WHERE branch_id = ? AND substr(created_at,1,7)=? AND payment_type != 'refund'"
    )
    .get(branchId, month);
  return {
    productCount: db.prepare("SELECT COUNT(*) as c FROM products WHERE branch_id = ?").get(branchId).c,
    customerCount: db.prepare("SELECT COUNT(*) as c FROM customers WHERE branch_id = ?").get(branchId).c,
    saleCount: db.prepare("SELECT COUNT(*) as c FROM sales WHERE branch_id = ? AND payment_type != 'refund'").get(branchId).c,
    totalDebt: db.prepare("SELECT COALESCE(SUM(debt),0) as t FROM customers WHERE branch_id = ?").get(branchId).t,
    todayCount: todayRow.c,
    todayTotal: todayRow.t,
    monthCount: monthRow.c,
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
       FROM branches b WHERE b.firm_id = ? ORDER BY CAST(b.code AS INTEGER), b.name`
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
    .prepare("SELECT * FROM branches WHERE firm_id = ? ORDER BY CAST(code AS INTEGER), name")
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
      email: branch.email,
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
      "INSERT INTO branches (id, firm_id, name, code, email, password_hash, address, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)"
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

  const { name, email, address, active, password } = req.body;
  const nextEmail = email?.trim() ? normalizeBranchEmail(email) : existing.email;
  if (email?.trim() && !isValidBranchEmail(nextEmail)) {
    return res.status(400).json({ error: "Geçerli bir e-posta girin" });
  }
  if (nextEmail !== existing.email) {
    const taken = db.prepare("SELECT id FROM branches WHERE email = ? AND id != ?").get(nextEmail, req.params.id);
    if (taken) return res.status(400).json({ error: "Bu e-posta zaten kullanılıyor" });
  }

  const nextPasswordHash = password?.trim() ? hashBranchPassword(password) : existing.password_hash;

  db.prepare(
    "UPDATE branches SET name=?, email=?, password_hash=?, address=?, active=? WHERE id=?"
  ).run(
    name ?? existing.name,
    nextEmail,
    nextPasswordHash,
    address ?? existing.address,
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

  db.prepare("UPDATE branches SET active = 0 WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

router.get("/qr-menu", (req, res) => {
  const db = getDb();
  const firmRow = ensureFirmSettings(db, req.user.firmId, req.user.firmName);
  const rows = db
    .prepare("SELECT * FROM branches WHERE firm_id = ? ORDER BY CAST(code AS INTEGER), name")
    .all(req.user.firmId);

  const branches = rows.map((row) => {
    const menu = rowToMenuBranch(row);
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
  const { menuEnabled, menuTitle, menuWelcome } = req.body;

  db.prepare(
    `UPDATE firm_settings SET
      menu_enabled = ?,
      menu_title = ?,
      menu_welcome = ?
     WHERE firm_id = ?`
  ).run(
    menuEnabled === true ? 1 : menuEnabled === false ? 0 : firmRow.menu_enabled,
    menuTitle ?? firmRow.menu_title ?? req.user.firmName,
    menuWelcome ?? firmRow.menu_welcome ?? "",
    req.user.firmId
  );

  res.json({
    firm: rowToFirmMenu(db.prepare("SELECT * FROM firm_settings WHERE firm_id = ?").get(req.user.firmId), req.user.firmName),
  });
});

router.patch("/qr-menu/branches/:id", (req, res) => {
  const db = getDb();
  const existing = getBranchOr404(db, req.params.id, req.user.firmId);
  if (!existing) return res.status(404).json({ error: "Şube bulunamadı" });

  const branch = db.prepare("SELECT * FROM branches WHERE id = ?").get(req.params.id);

  const { menuEnabled, menuAcceptOrders } = req.body;
  db.prepare(
    `UPDATE branches SET
      menu_enabled = ?,
      menu_accept_orders = ?
     WHERE id = ?`
  ).run(
    menuEnabled === true ? 1 : menuEnabled === false ? 0 : branch.menu_enabled,
    menuAcceptOrders === false ? 0 : menuAcceptOrders === true ? 1 : branch.menu_accept_orders,
    req.params.id
  );

  res.json(rowToMenuBranch(db.prepare("SELECT * FROM branches WHERE id = ?").get(req.params.id)));
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

export default router;
