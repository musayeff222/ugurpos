import { uid } from "../db/index.js";
import { getSalePaymentParts } from "./salePayments.js";

const PAYMENTS = new Set(["borc", "nagd", "kart"]);

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function roundMoney(value) {
  return Math.round(num(value) * 100) / 100;
}

export function ensureAccountKassas(db, firmId) {
  const existing = db.prepare("SELECT id FROM account_kassas WHERE firm_id = ? LIMIT 1").get(firmId);
  if (existing) return;
  const insert = db.prepare(
    "INSERT INTO account_kassas (id, firm_id, name, kind) VALUES (?, ?, ?, ?)"
  );
  insert.run(uid("kassa"), firmId, "Nakit kasa", "nakit");
  insert.run(uid("kassa"), firmId, "Banka kasa", "banka");
}

function kassaBalances(db, firmId) {
  const kassas = db
    .prepare("SELECT id, name, kind FROM account_kassas WHERE firm_id = ? ORDER BY created_at, name")
    .all(firmId);
  return kassas.map((kassa) => {
    const inn = num(
      db
        .prepare(
          "SELECT COALESCE(SUM(amount), 0) AS t FROM account_movements WHERE kassa_id = ? AND direction = 'in'"
        )
        .get(kassa.id)?.t
    );
    const out = num(
      db
        .prepare(
          "SELECT COALESCE(SUM(amount), 0) AS t FROM account_movements WHERE kassa_id = ? AND direction = 'out'"
        )
        .get(kassa.id)?.t
    );
    return { ...kassa, balance: roundMoney(inn - out) };
  });
}

function wholesalerDebts(db, firmId) {
  const people = db
    .prepare(
      `SELECT w.id, w.name, w.phone, w.note, w.created_at AS createdAt,
              (SELECT COALESCE(SUM(total), 0) FROM account_purchases p
                WHERE p.firm_id = w.firm_id AND p.wholesaler_id = w.id AND p.payment_type = 'borc') AS debtBought,
              (SELECT COALESCE(SUM(amount), 0) FROM account_movements m
                WHERE m.firm_id = w.firm_id AND m.kind = 'debt' AND m.ref_id = w.id) AS debtPaid,
              (SELECT COUNT(*) FROM account_purchases p WHERE p.firm_id = w.firm_id AND p.wholesaler_id = w.id) AS purchaseCount,
              (SELECT COALESCE(SUM(total), 0) FROM account_purchases p WHERE p.firm_id = w.firm_id AND p.wholesaler_id = w.id) AS purchaseTotal,
              (SELECT MAX(created_at) FROM account_purchases p WHERE p.firm_id = w.firm_id AND p.wholesaler_id = w.id) AS lastPurchaseAt
       FROM account_wholesalers w
       WHERE w.firm_id = ?
       ORDER BY w.name`
    )
    .all(firmId);
  return people.map((person) => {
    const bought = num(person.debtBought);
    const paid = num(person.debtPaid);
    return {
      id: person.id,
      name: person.name,
      phone: person.phone || "",
      note: person.note || "",
      createdAt: person.createdAt || "",
      debt: roundMoney(Math.max(0, bought - paid)),
      debtBought: roundMoney(bought),
      debtPaid: roundMoney(paid),
      purchaseCount: Number(person.purchaseCount) || 0,
      purchaseTotal: roundMoney(person.purchaseTotal),
      lastPurchaseAt: person.lastPurchaseAt || "",
    };
  });
}

function rememberedPrices(db, firmId) {
  return db
    .prepare(
      "SELECT wholesaler_id AS wholesalerId, firm_product_id AS productId, buy_price AS buyPrice FROM account_buy_prices WHERE firm_id = ?"
    )
    .all(firmId)
    .map((row) => ({ ...row, buyPrice: num(row.buyPrice) }));
}

function recentPurchases(db, firmId) {
  const rows = db
    .prepare(
      `SELECT p.id, p.wholesaler_id AS wholesalerId, w.name AS wholesalerName, w.phone AS wholesalerPhone,
              p.payment_type AS paymentType, p.kassa_id AS kassaId, k.name AS kassaName,
              p.total, p.note, p.created_at AS createdAt
       FROM account_purchases p
       LEFT JOIN account_wholesalers w ON w.id = p.wholesaler_id
       LEFT JOIN account_kassas k ON k.id = p.kassa_id
       WHERE p.firm_id = ?
       ORDER BY p.created_at DESC
       LIMIT 40`
    )
    .all(firmId);
  return rows.map((row) => ({
    ...row,
    total: num(row.total),
    lines: db
      .prepare(
        "SELECT firm_product_id AS productId, name, qty, buy_price AS buyPrice FROM account_purchase_lines WHERE purchase_id = ?"
      )
      .all(row.id)
      .map((line) => ({ ...line, qty: num(line.qty), buyPrice: num(line.buyPrice) })),
  }));
}

function bakuToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baku",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T12:00:00+04:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baku",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function salesBranches(db, firmId) {
  return db
    .prepare("SELECT id, name, kind FROM branches WHERE firm_id = ? AND active = 1 ORDER BY name")
    .all(firmId)
    .filter((branch) => branch.kind !== "production");
}

function ensureFirmDay(db, firmId) {
  const existing = db.prepare("SELECT business_date AS businessDate, opened_at AS openedAt FROM account_firm_days WHERE firm_id = ?").get(firmId);
  if (existing) return existing;
  const businessDate = bakuToday();
  const openedAt = `${businessDate}T00:00:00.000+04:00`;
  db.prepare("INSERT INTO account_firm_days (firm_id, business_date, opened_at) VALUES (?, ?, ?)").run(
    firmId,
    businessDate,
    openedAt
  );
  return { businessDate, openedAt };
}

function periodParts(db, branchId, openedAt) {
  const start = new Date(openedAt).getTime();
  const sales = db
    .prepare(
      "SELECT created_at, payment_type, total, cash_amount, pos_amount FROM sales WHERE branch_id = ? AND payment_type != 'refund'"
    )
    .all(branchId);
  return sales
    .filter((sale) => {
      const time = new Date(sale.created_at).getTime();
      return Number.isFinite(time) && time >= start;
    })
    .reduce(
      (sum, sale) => {
        const parts = getSalePaymentParts(sale);
        sum.cash += parts.cash;
        sum.pos += parts.pos;
        return sum;
      },
      { cash: 0, pos: 0 }
    );
}

function periodExpenses(db, branchId, businessDate) {
  const rows = db.prepare("SELECT amount, date FROM expense_entries WHERE branch_id = ?").all(branchId);
  return roundMoney(
    rows
      .filter((row) => String(row.date || "").slice(0, 10) >= businessDate)
      .reduce((sum, row) => sum + num(row.amount), 0)
  );
}

function branchCloseRow(db, branchId, businessDate) {
  return db
    .prepare(
      "SELECT id, amount, closed_at AS closedAt FROM account_day_closes WHERE branch_id = ? AND business_date = ?"
    )
    .get(branchId, businessDate);
}

function dayBranches(db, firmId, businessDate, openedAt) {
  return salesBranches(db, firmId).map((branch) => {
    const available = branchAvailable(db, branch.id);
    const cardAvailable = branchCardAvailable(db, branch.id);
    const close = branchCloseRow(db, branch.id, businessDate);
    const parts = periodParts(db, branch.id, openedAt);
    const closed = Boolean(close) && available <= 0.009 && cardAvailable <= 0.009;
    return {
      id: branch.id,
      name: branch.name,
      cashSales: roundMoney(parts.cash),
      cardSales: roundMoney(parts.pos),
      expenses: periodExpenses(db, branch.id, businessDate),
      available,
      cardAvailable,
      closed,
      closedAt: close?.closedAt || "",
    };
  });
}

export function getFirmDay(db, firmId) {
  const day = ensureFirmDay(db, firmId);
  const today = bakuToday();
  const branches = dayBranches(db, firmId, day.businessDate, day.openedAt);
  const openCount = branches.filter((branch) => !branch.closed).length;
  return {
    businessDate: day.businessDate,
    today,
    blocked: day.businessDate < today && openCount > 0,
    ahead: day.businessDate > today,
    openCount,
    branches,
  };
}

function maybeAdvanceFirmDay(db, firmId, businessDate) {
  const today = bakuToday();
  if (businessDate > today) return;
  const branches = dayBranches(db, firmId, businessDate, ensureFirmDay(db, firmId).openedAt);
  if (!branches.length || branches.some((branch) => !branch.closed)) return;
  const next = businessDate < today ? today : addDays(businessDate, 1);
  db.prepare("UPDATE account_firm_days SET business_date = ?, opened_at = ? WHERE firm_id = ?").run(
    next,
    new Date().toISOString(),
    firmId
  );
}

export function closeBranchDay(db, firmId, branchId) {
  ensureAccountKassas(db, firmId);
  const day = ensureFirmDay(db, firmId);
  const branch = salesBranches(db, firmId).find((row) => row.id === branchId);
  if (!branch) throw new Error("Satış şubesi bulunamadı");
  const available = branchAvailable(db, branch.id);
  const cardAvailable = branchCardAvailable(db, branch.id);
  const existing = branchCloseRow(db, branch.id, day.businessDate);
  if (existing && available <= 0.009 && cardAvailable <= 0.009) throw new Error("Bu şube bu gün kapandı");
  const nakit = db
    .prepare("SELECT id, name FROM account_kassas WHERE firm_id = ? AND kind = 'nakit' ORDER BY created_at LIMIT 1")
    .get(firmId);
  const banka = db
    .prepare("SELECT id, name FROM account_kassas WHERE firm_id = ? AND kind = 'banka' ORDER BY created_at LIMIT 1")
    .get(firmId);
  if (available > 0.009 && !nakit) throw new Error("Nakit kasa yok");
  if (cardAvailable > 0.009 && !banka) throw new Error("Banka kasa yok");
  const collected = roundMoney(available + cardAvailable);
  const write = db.transaction(() => {
    const pull = (kassaId, amount, kind, label) => {
      const pullId = uid("pull");
      db.prepare(
        "INSERT INTO account_branch_pulls (id, firm_id, branch_id, kassa_id, amount, kind, note) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(pullId, firmId, branch.id, kassaId, amount, kind, `${day.businessDate} gün sonu ${label}`);
      db.prepare(
        "INSERT INTO account_movements (id, firm_id, kassa_id, direction, amount, kind, ref_id, note) VALUES (?, ?, ?, 'in', ?, 'branch', ?, ?)"
      ).run(uid("mov"), firmId, kassaId, amount, pullId, `${branch.name} ${label}`);
    };
    if (available > 0.009) pull(nakit.id, available, "nakit", "nakit");
    if (cardAvailable > 0.009) pull(banka.id, cardAvailable, "kart", "kart");
    const closedAt = new Date().toISOString();
    if (existing) {
      db.prepare("UPDATE account_day_closes SET amount = ?, closed_at = ? WHERE id = ?").run(
        roundMoney(num(existing.amount) + collected),
        closedAt,
        existing.id
      );
    } else {
      db.prepare(
        "INSERT INTO account_day_closes (id, firm_id, branch_id, business_date, amount, kassa_id, closed_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(uid("day"), firmId, branch.id, day.businessDate, collected, nakit?.id || banka?.id || null, closedAt);
    }
    maybeAdvanceFirmDay(db, firmId, day.businessDate);
  });
  write();
  return getFirmDay(db, firmId);
}

function branchAvailable(db, branchId) {
  const sales = db
    .prepare(
      "SELECT payment_type, total, cash_amount, pos_amount FROM sales WHERE branch_id = ? AND payment_type != 'refund'"
    )
    .all(branchId);
  const cash = sales.reduce((sum, sale) => sum + getSalePaymentParts(sale).cash, 0);
  const expenses = num(
    db.prepare("SELECT COALESCE(SUM(amount), 0) AS t FROM expense_entries WHERE branch_id = ?").get(branchId)?.t
  );
  const withdrawn = num(
    db.prepare("SELECT COALESCE(SUM(amount), 0) AS t FROM cash_withdrawals WHERE branch_id = ?").get(branchId)?.t
  );
  const pulled = num(
    db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) AS t FROM account_branch_pulls WHERE branch_id = ? AND (kind IS NULL OR kind = '' OR kind = 'nakit')"
      )
      .get(branchId)?.t
  );
  return roundMoney(Math.max(0, cash - expenses - withdrawn - pulled));
}

function branchCardAvailable(db, branchId) {
  const sales = db
    .prepare(
      "SELECT payment_type, total, cash_amount, pos_amount FROM sales WHERE branch_id = ? AND payment_type != 'refund'"
    )
    .all(branchId);
  const card = sales.reduce((sum, sale) => sum + getSalePaymentParts(sale).pos, 0);
  const pulled = num(
    db
      .prepare("SELECT COALESCE(SUM(amount), 0) AS t FROM account_branch_pulls WHERE branch_id = ? AND kind = 'kart'")
      .get(branchId)?.t
  );
  return roundMoney(Math.max(0, card - pulled));
}

export function getAccountingOverview(db, firmId) {
  ensureAccountKassas(db, firmId);
  const products = db
    .prepare(
      "SELECT id, name, unit, buy_price AS buyPrice FROM firm_products WHERE firm_id = ? AND active = 1 ORDER BY name"
    )
    .all(firmId)
    .map((row) => ({ ...row, buyPrice: num(row.buyPrice) }));
  const branches = db
    .prepare("SELECT id, name, code FROM branches WHERE firm_id = ? AND active = 1 ORDER BY name")
    .all(firmId)
    .map((branch) => ({ ...branch, available: branchAvailable(db, branch.id) }));
  return {
    kassas: kassaBalances(db, firmId),
    wholesalers: wholesalerDebts(db, firmId),
    products,
    prices: rememberedPrices(db, firmId),
    purchases: recentPurchases(db, firmId),
    branches,
    day: getFirmDay(db, firmId),
  };
}

export function createWholesaler(db, firmId, body) {
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const note = String(body.note || "").trim();
  if (!name) throw new Error("Toptancı adı zorunludur");
  const id = uid("td");
  db.prepare("INSERT INTO account_wholesalers (id, firm_id, name, phone, note) VALUES (?, ?, ?, ?, ?)").run(
    id,
    firmId,
    name,
    phone,
    note
  );
  return { id, name, phone, note, debt: 0, purchaseCount: 0, purchaseTotal: 0 };
}

export function updateWholesaler(db, firmId, id, body) {
  const existing = db.prepare("SELECT id FROM account_wholesalers WHERE id = ? AND firm_id = ?").get(id, firmId);
  if (!existing) throw new Error("Toptancı bulunamadı");
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const note = String(body.note || "").trim();
  if (!name) throw new Error("Toptancı adı zorunludur");
  db.prepare("UPDATE account_wholesalers SET name = ?, phone = ?, note = ? WHERE id = ?").run(name, phone, note, id);
  return { id, name, phone, note };
}

function purchaseRows(db, firmId, wholesalerId) {
  const rows = db
    .prepare(
      `SELECT p.id, p.wholesaler_id AS wholesalerId, w.name AS wholesalerName, w.phone AS wholesalerPhone,
              p.payment_type AS paymentType, p.kassa_id AS kassaId, k.name AS kassaName,
              p.total, p.note, p.created_at AS createdAt
       FROM account_purchases p
       LEFT JOIN account_wholesalers w ON w.id = p.wholesaler_id
       LEFT JOIN account_kassas k ON k.id = p.kassa_id
       WHERE p.firm_id = ? AND p.wholesaler_id = ?
       ORDER BY p.created_at DESC
       LIMIT 80`
    )
    .all(firmId, wholesalerId);
  return rows.map((row) => ({
    ...row,
    total: num(row.total),
    lines: db
      .prepare(
        "SELECT firm_product_id AS productId, name, qty, buy_price AS buyPrice FROM account_purchase_lines WHERE purchase_id = ?"
      )
      .all(row.id)
      .map((line) => ({ ...line, qty: num(line.qty), buyPrice: num(line.buyPrice) })),
  }));
}

export function getWholesalerDetail(db, firmId, id) {
  const person = wholesalerDebts(db, firmId).find((row) => row.id === id);
  if (!person) throw new Error("Toptancı bulunamadı");
  const payments = db
    .prepare(
      `SELECT m.id, m.amount, m.note, m.created_at AS createdAt, k.name AS kassaName
       FROM account_movements m
       LEFT JOIN account_kassas k ON k.id = m.kassa_id
       WHERE m.firm_id = ? AND m.kind = 'debt' AND m.ref_id = ?
       ORDER BY m.created_at DESC
       LIMIT 80`
    )
    .all(firmId, id)
    .map((row) => ({ ...row, amount: num(row.amount) }));
  const prices = db
    .prepare(
      `SELECT b.firm_product_id AS productId, p.name, b.buy_price AS buyPrice
       FROM account_buy_prices b
       LEFT JOIN firm_products p ON p.id = b.firm_product_id
       WHERE b.firm_id = ? AND b.wholesaler_id = ?
       ORDER BY p.name`
    )
    .all(firmId, id)
    .map((row) => ({ ...row, buyPrice: num(row.buyPrice), name: row.name || "Ürün" }));
  return { ...person, purchases: purchaseRows(db, firmId, id), payments, prices };
}

export function createKassa(db, firmId, body) {
  const name = String(body.name || "").trim();
  const kind = body.kind === "banka" || body.kind === "nakit" ? body.kind : "diger";
  if (!name) throw new Error("Kasa adı zorunludur");
  const id = uid("kassa");
  db.prepare("INSERT INTO account_kassas (id, firm_id, name, kind) VALUES (?, ?, ?, ?)").run(id, firmId, name, kind);
  return { id, name, kind, balance: 0 };
}

function rememberPrice(db, firmId, wholesalerId, productId, buyPrice) {
  if (!productId) return;
  const existing = db
    .prepare(
      "SELECT firm_product_id FROM account_buy_prices WHERE firm_id = ? AND wholesaler_id = ? AND firm_product_id = ?"
    )
    .get(firmId, wholesalerId, productId);
  if (existing) {
    db.prepare(
      "UPDATE account_buy_prices SET buy_price = ? WHERE firm_id = ? AND wholesaler_id = ? AND firm_product_id = ?"
    ).run(buyPrice, firmId, wholesalerId, productId);
  } else {
    db.prepare(
      "INSERT INTO account_buy_prices (firm_id, wholesaler_id, firm_product_id, buy_price) VALUES (?, ?, ?, ?)"
    ).run(firmId, wholesalerId, productId, buyPrice);
  }
  db.prepare("UPDATE firm_products SET buy_price = ? WHERE id = ? AND firm_id = ?").run(buyPrice, productId, firmId);
}

export function createPurchase(db, firmId, body) {
  ensureAccountKassas(db, firmId);
  const wholesalerId = String(body.wholesalerId || "");
  const paymentType = String(body.paymentType || "");
  const seller = db
    .prepare("SELECT id, name FROM account_wholesalers WHERE id = ? AND firm_id = ?")
    .get(wholesalerId, firmId);
  if (!seller) throw new Error("Satan topdancıyı seçin");
  if (!PAYMENTS.has(paymentType)) throw new Error("Ödeme: borç, nakit veya kart");

  const lines = (Array.isArray(body.lines) ? body.lines : [])
    .map((line) => {
      const product = line.productId
        ? db
            .prepare("SELECT id, name FROM firm_products WHERE id = ? AND firm_id = ? AND active = 1")
            .get(line.productId, firmId)
        : null;
      const qty = num(line.qty);
      const buyPrice = roundMoney(line.buyPrice);
      return {
        productId: product?.id || null,
        name: product?.name || String(line.name || "").trim(),
        qty,
        buyPrice,
      };
    })
    .filter((line) => line.name && line.qty > 0);
  if (!lines.length) throw new Error("Alınacak ürünü seçin");

  let kassa = null;
  if (paymentType !== "borc") {
    const wantedKind = paymentType === "kart" ? "banka" : "nakit";
    kassa = body.kassaId
      ? db.prepare("SELECT id, name, kind FROM account_kassas WHERE id = ? AND firm_id = ?").get(body.kassaId, firmId)
      : db
          .prepare("SELECT id, name, kind FROM account_kassas WHERE firm_id = ? AND kind = ? ORDER BY created_at LIMIT 1")
          .get(firmId, wantedKind);
    if (!kassa) throw new Error("Ödeme için kasa seçin");
  }

  const total = roundMoney(lines.reduce((sum, line) => sum + line.qty * line.buyPrice, 0));
  if (kassa) {
    const balance = kassaBalances(db, firmId).find((row) => row.id === kassa.id)?.balance || 0;
    if (total > balance + 0.001) {
      throw new Error("Kasada yeterli para yok. Önce şubeden kasaya alın veya borç seçin");
    }
  }
  const purchaseId = uid("alis");
  const write = db.transaction(() => {
    db.prepare(
      "INSERT INTO account_purchases (id, firm_id, wholesaler_id, payment_type, kassa_id, total, note) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(purchaseId, firmId, wholesalerId, paymentType, kassa?.id || null, total, String(body.note || "").trim());
    const lineInsert = db.prepare(
      "INSERT INTO account_purchase_lines (id, purchase_id, firm_product_id, name, qty, buy_price) VALUES (?, ?, ?, ?, ?, ?)"
    );
    for (const line of lines) {
      lineInsert.run(uid("line"), purchaseId, line.productId, line.name, line.qty, line.buyPrice);
      rememberPrice(db, firmId, wholesalerId, line.productId, line.buyPrice);
    }
    if (kassa) {
      db.prepare(
        "INSERT INTO account_movements (id, firm_id, kassa_id, direction, amount, kind, ref_id, note) VALUES (?, ?, ?, 'out', ?, 'purchase', ?, ?)"
      ).run(uid("mov"), firmId, kassa.id, total, purchaseId, `${seller.name} alışı`);
    }
  });
  write();
  return { id: purchaseId, total };
}

export function payDebt(db, firmId, body) {
  const wholesaler = db
    .prepare("SELECT id, name FROM account_wholesalers WHERE id = ? AND firm_id = ?")
    .get(body.wholesalerId, firmId);
  if (!wholesaler) throw new Error("Topdancı bulunamadı");
  const amount = roundMoney(body.amount);
  if (amount <= 0) throw new Error("Tutar girin");
  const debt = wholesalerDebts(db, firmId).find((row) => row.id === wholesaler.id)?.debt || 0;
  if (amount > debt + 0.001) throw new Error("Borçtan fazla ödeme olmaz");
  const kassa = db
    .prepare("SELECT id, name FROM account_kassas WHERE id = ? AND firm_id = ?")
    .get(body.kassaId, firmId);
  if (!kassa) throw new Error("Kasa seçin");
  const balance = kassaBalances(db, firmId).find((row) => row.id === kassa.id)?.balance || 0;
  if (amount > balance + 0.001) throw new Error("Kasada yeterli para yok");
  db.prepare(
    "INSERT INTO account_movements (id, firm_id, kassa_id, direction, amount, kind, ref_id, note) VALUES (?, ?, ?, 'out', ?, 'debt', ?, ?)"
  ).run(uid("mov"), firmId, kassa.id, amount, wholesaler.id, `${wholesaler.name} borç ödemesi`);
  return { ok: true };
}

export function pullBranchCash(db, firmId, body) {
  const branch = db.prepare("SELECT id, name FROM branches WHERE id = ? AND firm_id = ?").get(body.branchId, firmId);
  if (!branch) throw new Error("Şube bulunamadı");
  const amount = roundMoney(body.amount);
  if (amount <= 0) throw new Error("Tutar girin");
  const available = branchAvailable(db, branch.id);
  if (amount > available + 0.001) throw new Error("Şubede bu kadar nakit yok");
  const kassa = db
    .prepare("SELECT id FROM account_kassas WHERE id = ? AND firm_id = ?")
    .get(body.kassaId, firmId);
  if (!kassa) throw new Error("Kasa seçin");
  const pullId = uid("pull");
  const write = db.transaction(() => {
    db.prepare(
      "INSERT INTO account_branch_pulls (id, firm_id, branch_id, kassa_id, amount, kind, note) VALUES (?, ?, ?, ?, ?, 'nakit', ?)"
    ).run(pullId, firmId, branch.id, kassa.id, amount, String(body.note || "").trim());
    db.prepare(
      "INSERT INTO account_movements (id, firm_id, kassa_id, direction, amount, kind, ref_id, note) VALUES (?, ?, ?, 'in', ?, 'branch', ?, ?)"
    ).run(uid("mov"), firmId, kassa.id, amount, pullId, `${branch.name} şubesinden`);
  });
  write();
  return { id: pullId };
}
