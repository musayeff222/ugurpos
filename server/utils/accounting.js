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
    .prepare("SELECT id, name, phone, note FROM account_wholesalers WHERE firm_id = ? ORDER BY name")
    .all(firmId);
  return people.map((person) => {
    const bought = num(
      db
        .prepare(
          "SELECT COALESCE(SUM(total), 0) AS t FROM account_purchases WHERE firm_id = ? AND wholesaler_id = ? AND payment_type = 'borc'"
        )
        .get(firmId, person.id)?.t
    );
    const paid = num(
      db
        .prepare(
          "SELECT COALESCE(SUM(amount), 0) AS t FROM account_movements WHERE firm_id = ? AND kind = 'debt' AND ref_id = ?"
        )
        .get(firmId, person.id)?.t
    );
    return { ...person, debt: roundMoney(Math.max(0, bought - paid)) };
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
    db.prepare("SELECT COALESCE(SUM(amount), 0) AS t FROM account_branch_pulls WHERE branch_id = ?").get(branchId)?.t
  );
  return roundMoney(Math.max(0, cash - expenses - withdrawn - pulled));
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
  };
}

export function createWholesaler(db, firmId, body) {
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  if (!name) throw new Error("Topdancı adı zorunludur");
  const id = uid("td");
  db.prepare("INSERT INTO account_wholesalers (id, firm_id, name, phone) VALUES (?, ?, ?, ?)").run(
    id,
    firmId,
    name,
    phone
  );
  return { id, name, phone, debt: 0 };
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
      "INSERT INTO account_branch_pulls (id, firm_id, branch_id, kassa_id, amount, note) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(pullId, firmId, branch.id, kassa.id, amount, String(body.note || "").trim());
    db.prepare(
      "INSERT INTO account_movements (id, firm_id, kassa_id, direction, amount, kind, ref_id, note) VALUES (?, ?, ?, 'in', ?, 'branch', ?, ?)"
    ).run(uid("mov"), firmId, kassa.id, amount, pullId, `${branch.name} şubesinden`);
  });
  write();
  return { id: pullId };
}
