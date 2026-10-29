import bcrypt from "bcryptjs";
import { uid } from "../db/index.js";
import { ELEMAN_CATALOG } from "../db/migrate-eleman.js";

function num(value) {
  if (typeof value === "string") {
    value = value.replace(/\s/g, "").replace(",", ".");
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function roundMoney(value) {
  return Math.round(num(value) * 100) / 100;
}

function roundQty(value) {
  return Math.round(num(value) * 1000) / 1000;
}

function textEq(db, left, right) {
  if (db.dialect !== "mysql") return `${left} = ${right}`;
  return `${left} COLLATE utf8mb4_unicode_ci = ${right} COLLATE utf8mb4_unicode_ci`;
}

function personName(row) {
  return `${row.firstName || row.first_name || ""} ${row.lastName || row.last_name || ""}`.trim();
}

function normalizeLogin(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeUnit(value) {
  const unit = String(value || "")
    .trim()
    .toLocaleLowerCase("az");
  if (unit === "kq" || unit === "kg" || unit === "kilo" || unit === "kilogram") return "kq";
  return "adet";
}

function unitLabel(unit) {
  return normalizeUnit(unit) === "kq" ? "kq" : "ədəd";
}

export function ensureElemanCatalog(db, firmId) {
  const count = num(db.prepare("SELECT COUNT(*) AS c FROM eleman_products WHERE firm_id = ?").get(firmId)?.c);
  if (count > 0) return;
  const insert = db.prepare(
    "INSERT INTO eleman_products (id, firm_id, name, unit, price, sort_no, active) VALUES (?, ?, ?, ?, 0, ?, 1)"
  );
  const write = db.transaction(() => {
    ELEMAN_CATALOG.forEach((item, index) => {
      insert.run(uid("elp"), firmId, item.name, item.unit, index + 1);
    });
  });
  write();
}

function stockRow(db, elemanId, productId, unit) {
  return db
    .prepare(
      "SELECT qty, unit_cost AS unitCost FROM eleman_stock WHERE eleman_id = ? AND product_id = ? AND unit = ?"
    )
    .get(elemanId, productId, normalizeUnit(unit));
}

function stockQty(db, elemanId, productId, unit) {
  return roundQty(stockRow(db, elemanId, productId, unit)?.qty);
}

function stockCost(db, elemanId, productId, unit) {
  return roundMoney(stockRow(db, elemanId, productId, unit)?.unitCost);
}

function addStock(db, firmId, elemanId, productId, unit, qty, unitCost = 0) {
  const nextUnit = normalizeUnit(unit);
  const nextQty = roundQty(qty);
  if (!productId || nextQty === 0) return;
  const existing = stockRow(db, elemanId, productId, nextUnit);
  if (existing) {
    const oldQty = roundQty(existing.qty);
    const oldCost = roundMoney(existing.unitCost);
    const afterQty = roundQty(oldQty + nextQty);
    let nextCost = oldCost;
    if (nextQty > 0) {
      if (oldQty > 0 && afterQty > 0) {
        nextCost = roundMoney((oldQty * oldCost + nextQty * roundMoney(unitCost)) / afterQty);
      } else {
        nextCost = roundMoney(unitCost);
      }
    }
    db.prepare("UPDATE eleman_stock SET qty = ?, unit_cost = ? WHERE eleman_id = ? AND product_id = ? AND unit = ?").run(
      afterQty,
      nextCost,
      elemanId,
      productId,
      nextUnit
    );
  } else if (nextQty > 0) {
    db.prepare(
      "INSERT INTO eleman_stock (firm_id, eleman_id, product_id, unit, qty, unit_cost) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(firmId, elemanId, productId, nextUnit, nextQty, roundMoney(unitCost));
  }
}

function cashWallet(value) {
  return String(value || "main") === "franchise" ? "franchise" : "main";
}

function franchiseSellPrice(unitCost, percent) {
  return roundMoney(roundMoney(unitCost) * (1 + num(percent) / 100));
}

function insertElemanCash(db, { firmId, elemanId, direction, amount, kind, refId, note, wallet = "main" }) {
  db.prepare(
    "INSERT INTO eleman_cash (id, firm_id, eleman_id, direction, amount, kind, ref_id, note, wallet) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(uid("elc"), firmId, elemanId, direction, roundMoney(amount), kind, refId || null, note || "", cashWallet(wallet));
}

export function elemanBalance(db, elemanId, wallet = "main") {
  const bag = cashWallet(wallet);
  const rows = db.prepare("SELECT direction, amount, wallet FROM eleman_cash WHERE eleman_id = ?").all(elemanId);
  return roundMoney(
    rows.reduce((sum, row) => {
      if (cashWallet(row.wallet) !== bag) return sum;
      return sum + (row.direction === "in" ? num(row.amount) : -num(row.amount));
    }, 0)
  );
}

function mapPerson(row, extras = {}) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    name: personName({ firstName: row.first_name, lastName: row.last_name }),
    phone: row.phone || "",
    login: row.login,
    blocked: Number(row.blocked) === 1,
    createdAt: row.created_at || "",
    ...extras,
  };
}

function purchaseLines(db, purchaseId) {
  return db
    .prepare(
      "SELECT product_id AS productId, name, qty, unit, price FROM eleman_purchase_lines WHERE purchase_id = ?"
    )
    .all(purchaseId)
    .map((line) => ({ ...line, qty: num(line.qty), price: num(line.price), unit: unitLabel(line.unit) }));
}

function deliveryLines(db, deliveryId) {
  return db
    .prepare(
      "SELECT product_id AS productId, name, qty, unit, price FROM eleman_delivery_lines WHERE delivery_id = ?"
    )
    .all(deliveryId)
    .map((line) => ({ ...line, qty: num(line.qty), price: num(line.price), unit: unitLabel(line.unit) }));
}

function mapPurchase(db, row) {
  return {
    id: row.id,
    elemanId: row.eleman_id,
    total: num(row.total),
    invoiceUrl: row.invoice_url || "",
    createdAt: row.created_at,
    lines: purchaseLines(db, row.id),
  };
}

function franchisePaidAmount(row) {
  const total = num(row.total);
  const payType = String(row.payType || row.pay_type || "");
  const stored = num(row.paidAmount ?? row.paid_amount);
  if (payType === "split") {
    if (stored > 0) return roundMoney(Math.min(total, stored));
    return roundMoney(total / 2);
  }
  if (payType === "cash") return total;
  if (payType === "debt") return 0;
  return stored > 0 ? roundMoney(Math.min(total, stored)) : 0;
}

function franchiseDebtAmount(row) {
  return roundMoney(Math.max(0, num(row.total) - franchisePaidAmount(row)));
}

function mapDelivery(db, row) {
  const total = num(row.total);
  const payType = String(row.pay_type || "");
  const paidAmount = franchisePaidAmount({ ...row, total, payType });
  return {
    id: row.id,
    elemanId: row.eleman_id,
    branchId: row.branch_id,
    branchName: row.branchName || row.branch_name || "",
    staffId: row.staff_id,
    staffName: `${row.staffName || row.staff_name || ""} ${row.staffSurname || row.staff_surname || ""}`.trim(),
    total,
    status: row.status,
    channel: String(row.channel || "branch") === "franchise" ? "franchise" : "branch",
    payType,
    paidAmount,
    debtAmount: roundMoney(Math.max(0, total - paidAmount)),
    createdAt: row.created_at,
    acceptedAt: row.accepted_at || "",
    lines: deliveryLines(db, row.id),
  };
}

export function listElemanProducts(db, firmId) {
  ensureElemanCatalog(db, firmId);
  return db
    .prepare(
      "SELECT id, name, unit, price, franchise_percent AS franchisePercent, sort_no AS sortNo, active FROM eleman_products WHERE firm_id = ? ORDER BY sort_no, name"
    )
    .all(firmId)
    .map((row) => ({
      ...row,
      price: num(row.price),
      franchisePercent: num(row.franchisePercent),
      active: Number(row.active) !== 0,
      unit: normalizeUnit(row.unit),
    }));
}

export function updateElemanProduct(db, firmId, id, body) {
  const existing = db.prepare("SELECT id FROM eleman_products WHERE id = ? AND firm_id = ?").get(id, firmId);
  if (!existing) throw new Error("Məhsul tapılmadı");
  const name = String(body.name || "").trim();
  if (!name) throw new Error("Məhsul adı yazın");
  const unit = normalizeUnit(body.unit);
  const price = roundMoney(body.price);
  const franchisePercent = Math.max(0, roundMoney(body.franchisePercent ?? body.franchise_percent));
  const active = body.active === false || body.active === 0 ? 0 : 1;
  db.prepare(
    "UPDATE eleman_products SET name = ?, unit = ?, price = ?, franchise_percent = ?, active = ? WHERE id = ? AND firm_id = ?"
  ).run(name, unit, price, franchisePercent, active, id, firmId);
  return listElemanProducts(db, firmId).find((row) => row.id === id);
}

export function listElemanPeople(db, firmId) {
  ensureElemanCatalog(db, firmId);
  const people = db
    .prepare(
      `SELECT id, first_name, last_name, phone, login, blocked, created_at
       FROM eleman_people WHERE firm_id = ? ORDER BY created_at, first_name`
    )
    .all(firmId);
  return people.map((row, index) =>
    mapPerson(row, {
      no: index + 1,
      balance: elemanBalance(db, row.id),
      franchiseBalance: elemanBalance(db, row.id, "franchise"),
      purchaseTotal: num(
        db.prepare("SELECT COALESCE(SUM(total), 0) AS t FROM eleman_purchases WHERE eleman_id = ?").get(row.id)?.t
      ),
      deliveryTotal: num(
        db
          .prepare("SELECT COALESCE(SUM(total), 0) AS t FROM eleman_deliveries WHERE eleman_id = ? AND status = 'accepted'")
          .get(row.id)?.t
      ),
      stockCount: num(
        db.prepare("SELECT COUNT(*) AS c FROM eleman_stock WHERE eleman_id = ? AND qty > 0").get(row.id)?.c
      ),
    })
  );
}

function listElemanWarehouse(db, firmId, elemanId) {
  return listElemanProducts(db, firmId)
    .filter((product) => product.active)
    .map((product) => {
      const qty = stockQty(db, elemanId, product.id, product.unit);
      return {
        productId: product.id,
        name: product.name,
        unit: unitLabel(product.unit),
        qty,
        status: qty > 0.0001 ? "var" : "yok",
      };
    });
}

export function getElemanPerson(db, firmId, id) {
  const row = db.prepare("SELECT * FROM eleman_people WHERE id = ? AND firm_id = ?").get(id, firmId);
  if (!row) throw new Error("Əlman tapılmadı");
  const purchases = db
    .prepare("SELECT * FROM eleman_purchases WHERE eleman_id = ? ORDER BY created_at DESC")
    .all(id)
    .map((item) => mapPurchase(db, item));
  const deliveries = db
    .prepare(
      `SELECT d.*, b.name AS branchName, s.name AS staffName, s.surname AS staffSurname
       FROM eleman_deliveries d
       LEFT JOIN branches b ON ${textEq(db, "b.id", "d.branch_id")}
       LEFT JOIN staff s ON ${textEq(db, "s.id", "d.staff_id")}
       WHERE d.eleman_id = ?
       ORDER BY d.created_at DESC`
    )
    .all(id)
    .map((item) => mapDelivery(db, item));
  const accepted = deliveries.filter((item) => item.status === "accepted");
  const stock = db
    .prepare(
      `SELECT st.product_id AS productId, p.name, st.unit, st.qty, st.unit_cost AS unitCost
       FROM eleman_stock st
       LEFT JOIN eleman_products p ON ${textEq(db, "p.id", "st.product_id")}
       WHERE st.eleman_id = ? AND st.qty > 0
       ORDER BY p.name`
    )
    .all(id)
    .map((item) => ({
      ...item,
      qty: num(item.qty),
      unitCost: roundMoney(item.unitCost),
      unit: unitLabel(item.unit),
      name: item.name || "Məhsul",
    }));
  return {
    ...mapPerson(row, {
      balance: elemanBalance(db, id),
      franchiseBalance: elemanBalance(db, id, "franchise"),
      purchaseTotal: purchases.reduce((sum, item) => sum + item.total, 0),
      deliveryTotal: accepted.filter((item) => item.channel !== "franchise").reduce((sum, item) => sum + item.total, 0),
      franchiseDeliveryTotal: accepted.filter((item) => item.channel === "franchise").reduce((sum, item) => sum + item.total, 0),
    }),
    purchases,
    deliveries,
    franchiseDeliveries: deliveries.filter((item) => item.channel === "franchise"),
    stock,
    warehouse: listElemanWarehouse(db, firmId, id),
  };
}

export function createElemanPerson(db, firmId, body) {
  const firstName = String(body.firstName || body.name || "").trim();
  const lastName = String(body.lastName || body.surname || "").trim();
  const phone = String(body.phone || "").trim();
  const login = normalizeLogin(body.login);
  const password = String(body.password || "");
  if (!firstName) throw new Error("Ad yazın");
  if (!lastName) throw new Error("Soyad yazın");
  if (!login) throw new Error("Login yazın");
  if (!password) throw new Error("Parol yazın");
  const taken = db.prepare("SELECT id FROM eleman_people WHERE firm_id = ? AND login = ?").get(firmId, login);
  if (taken) throw new Error("Bu login artıq var");
  const id = uid("elm");
  db.prepare(
    "INSERT INTO eleman_people (id, firm_id, first_name, last_name, phone, login, password_hash, blocked) VALUES (?, ?, ?, ?, ?, ?, ?, 0)"
  ).run(id, firmId, firstName, lastName, phone, login, bcrypt.hashSync(password, 10));
  return getElemanPerson(db, firmId, id);
}

export function updateElemanPerson(db, firmId, id, body) {
  const existing = db.prepare("SELECT * FROM eleman_people WHERE id = ? AND firm_id = ?").get(id, firmId);
  if (!existing) throw new Error("Əlman tapılmadı");
  const firstName = String(body.firstName || body.name || existing.first_name).trim();
  const lastName = String(body.lastName || body.surname || existing.last_name).trim();
  const phone = String(body.phone ?? existing.phone ?? "").trim();
  const login = normalizeLogin(body.login || existing.login);
  if (!firstName) throw new Error("Ad yazın");
  if (!lastName) throw new Error("Soyad yazın");
  if (!login) throw new Error("Login yazın");
  const taken = db
    .prepare("SELECT id FROM eleman_people WHERE firm_id = ? AND login = ? AND id != ?")
    .get(firmId, login, id);
  if (taken) throw new Error("Bu login artıq var");
  db.prepare(
    "UPDATE eleman_people SET first_name = ?, last_name = ?, phone = ?, login = ? WHERE id = ? AND firm_id = ?"
  ).run(firstName, lastName, phone, login, id, firmId);
  const password = String(body.password || "");
  if (password) {
    db.prepare("UPDATE eleman_people SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(password, 10), id);
  }
  return getElemanPerson(db, firmId, id);
}

export function setElemanBlocked(db, firmId, id, blocked) {
  const existing = db.prepare("SELECT id FROM eleman_people WHERE id = ? AND firm_id = ?").get(id, firmId);
  if (!existing) throw new Error("Əlman tapılmadı");
  db.prepare("UPDATE eleman_people SET blocked = ? WHERE id = ?").run(blocked ? 1 : 0, id);
  return getElemanPerson(db, firmId, id);
}

export function addElemanCash(db, firmId, id, body) {
  const person = db.prepare("SELECT id, first_name, last_name FROM eleman_people WHERE id = ? AND firm_id = ?").get(
    id,
    firmId
  );
  if (!person) throw new Error("Əlman tapılmadı");
  const amount = roundMoney(body.amount);
  if (amount <= 0) throw new Error("Məbləğ yazın");
  insertElemanCash(db, {
    firmId,
    elemanId: id,
    direction: "in",
    amount,
    kind: "deposit",
    refId: id,
    note: String(body.note || "").trim() || "Kassa artırıldı",
    wallet: "main",
  });
  return { balance: elemanBalance(db, id), franchiseBalance: elemanBalance(db, id, "franchise"), name: personName(person) };
}

export function findElemanByLogin(db, login, password) {
  const normalized = normalizeLogin(login);
  if (!normalized || !password) throw new Error("Login və parol yazın");
  const rows = db.prepare("SELECT * FROM eleman_people WHERE login = ?").all(normalized);
  const row = rows.find((item) => bcrypt.compareSync(password, item.password_hash));
  if (!row) throw new Error("Invalid credentials");
  if (Number(row.blocked) === 1) throw new Error("Bu hesab bloklanıb");
  return row;
}

export function elemanOverview(db, firmId, elemanId) {
  ensureElemanCatalog(db, firmId);
  const person = getElemanPerson(db, firmId, elemanId);
  const products = listElemanProducts(db, firmId).filter((item) => item.active);
  const stockMap = {};
  for (const item of person.stock) {
    stockMap[`${item.productId}:${normalizeUnit(item.unit)}`] = item.qty;
  }
  const withStock = products.map((product) => {
    const unitCost = stockCost(db, elemanId, product.id, product.unit);
    return {
      ...product,
      stock: stockQty(db, elemanId, product.id, product.unit),
      unitCost,
      franchisePrice: franchiseSellPrice(unitCost, product.franchisePercent),
    };
  });
  const rows = db
    .prepare(
      "SELECT id, name, kind FROM branches WHERE firm_id = ? AND active = 1 AND (kind IS NULL OR kind = '' OR kind != 'production') ORDER BY name"
    )
    .all(firmId);
  const branches = rows.filter((row) => String(row.kind || "") !== "franchise");
  const franchiseBranches = rows.filter((row) => String(row.kind || "") === "franchise");
  return {
    person,
    balance: person.balance,
    franchiseBalance: person.franchiseBalance,
    products: withStock,
    branches,
    franchiseBranches,
    purchases: person.purchases,
    deliveries: person.deliveries.filter((item) => item.channel !== "franchise"),
    franchiseDeliveries: person.franchiseDeliveries,
  };
}

export function listBranchCashiers(db, firmId, branchId) {
  const branch = db.prepare("SELECT id, name FROM branches WHERE id = ? AND firm_id = ? AND active = 1").get(
    branchId,
    firmId
  );
  if (!branch) throw new Error("Filial tapılmadı");
  const rows = db
    .prepare("SELECT id, name, surname, role FROM staff WHERE branch_id = ? AND active = 1 ORDER BY name")
    .all(branchId);
  const kasiyer = rows.filter((row) => String(row.role || "").toLocaleLowerCase("tr").includes("kasiyer"));
  const cashiers = (kasiyer.length ? kasiyer : rows).map((row) => ({
    id: row.id,
    name: `${row.name || ""} ${row.surname || ""}`.trim() || row.name,
  }));
  return { branch, cashiers };
}

function parseLines(db, firmId, rawLines, options = {}) {
  const catalog = listElemanProducts(db, firmId);
  return (Array.isArray(rawLines) ? rawLines : [])
    .map((line) => {
      const product = catalog.find((item) => item.id === line.productId);
      const qty = roundQty(line.qty);
      if (!product || qty <= 0) return null;
      const unit = normalizeUnit(line.unit || product.unit);
      const entered = roundMoney(line.price);
      let price = roundMoney(product.price);
      if (options.useEnteredPrice) {
        price = entered;
        if (price <= 0) return null;
      } else if (options.useStockCost || options.useFranchisePrice) {
        const cost = stockCost(db, options.elemanId, product.id, unit);
        if (cost <= 0) {
          throw new Error(`${product.name} üçün alış qiyməti yoxdur. Əvvəl alış edin.`);
        }
        if (options.useFranchisePrice) {
          price = entered > 0 ? entered : franchiseSellPrice(cost, product.franchisePercent);
        } else {
          price = cost;
        }
        if (price <= 0) {
          throw new Error(`${product.name} üçün franchise qiyməti yoxdur`);
        }
      }
      return {
        productId: product.id,
        name: product.name,
        qty,
        unit,
        price,
      };
    })
    .filter(Boolean);
}

export function createElemanPurchase(db, firmId, elemanId, body) {
  const person = db.prepare("SELECT id FROM eleman_people WHERE id = ? AND firm_id = ? AND blocked = 0").get(
    elemanId,
    firmId
  );
  if (!person) throw new Error("Əlman tapılmadı");
  const lines = parseLines(db, firmId, body.lines, { useEnteredPrice: true });
  if (!lines.length) throw new Error("Məhsul və alış qiymətini yazın");
  const total = roundMoney(lines.reduce((sum, line) => sum + line.qty * line.price, 0));
  if (total <= 0) throw new Error("Məbləğ yazın");
  const balance = elemanBalance(db, elemanId);
  if (total > balance + 0.001) throw new Error("Kassada kifayət qədər pul yoxdur");
  const invoiceUrl = String(body.invoiceUrl || "").trim();
  if (!invoiceUrl) throw new Error("Faktura şəklini yükləyin");
  const purchaseId = uid("elalis");
  const write = db.transaction(() => {
    db.prepare(
      "INSERT INTO eleman_purchases (id, firm_id, eleman_id, total, invoice_url) VALUES (?, ?, ?, ?, ?)"
    ).run(purchaseId, firmId, elemanId, total, invoiceUrl);
    const insertLine = db.prepare(
      "INSERT INTO eleman_purchase_lines (id, purchase_id, product_id, name, qty, unit, price) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    for (const line of lines) {
      insertLine.run(uid("ell"), purchaseId, line.productId, line.name, line.qty, line.unit, line.price);
      addStock(db, firmId, elemanId, line.productId, line.unit, line.qty, line.price);
    }
    insertElemanCash(db, {
      firmId,
      elemanId,
      direction: "out",
      amount: total,
      kind: "purchase",
      refId: purchaseId,
      note: "Alış",
      wallet: "main",
    });
  });
  write();
  return mapPurchase(db, db.prepare("SELECT * FROM eleman_purchases WHERE id = ?").get(purchaseId));
}

function loadDeliveryRow(db, deliveryId) {
  return db
    .prepare(
      `SELECT d.*, b.name AS branchName, s.name AS staffName, s.surname AS staffSurname
       FROM eleman_deliveries d
       LEFT JOIN branches b ON ${textEq(db, "b.id", "d.branch_id")}
       LEFT JOIN staff s ON ${textEq(db, "s.id", "d.staff_id")}
       WHERE d.id = ?`
    )
    .get(deliveryId);
}

export function createElemanDelivery(db, firmId, elemanId, body) {
  const person = db.prepare("SELECT id FROM eleman_people WHERE id = ? AND firm_id = ? AND blocked = 0").get(
    elemanId,
    firmId
  );
  if (!person) throw new Error("Əlman tapılmadı");
  const branch = db.prepare("SELECT id, name, kind FROM branches WHERE id = ? AND firm_id = ? AND active = 1").get(
    body.branchId,
    firmId
  );
  if (!branch) throw new Error("Filial seçin");
  const isFranchise = String(branch.kind || "") === "franchise";
  let staff = null;
  if (!isFranchise) {
    staff = db
      .prepare("SELECT id, name, surname FROM staff WHERE id = ? AND branch_id = ? AND active = 1")
      .get(body.staffId, branch.id);
    if (!staff) throw new Error("Kassir seçin");
  }
  const lines = parseLines(db, firmId, body.lines, {
    elemanId,
    useStockCost: !isFranchise,
    useFranchisePrice: isFranchise,
  });
  if (!lines.length) throw new Error("Məhsul seçin");
  for (const line of lines) {
    const have = stockQty(db, elemanId, line.productId, line.unit);
    if (line.qty > have + 0.0001) {
      throw new Error(`${line.name} üçün anbarda kifayət qədər məhsul yoxdur`);
    }
  }
  const total = roundMoney(lines.reduce((sum, line) => sum + line.qty * line.price, 0));
  let payType = "";
  let paidAmount = 0;
  if (isFranchise) {
    const rawType = String(body.payType || "cash");
    if (rawType === "debt") {
      payType = "debt";
      paidAmount = 0;
    } else if (rawType === "split") {
      paidAmount = roundMoney(body.paidAmount ?? body.cashAmount ?? total / 2);
      if (paidAmount < 0) paidAmount = 0;
      if (paidAmount > total) paidAmount = total;
      if (paidAmount <= 0) payType = "debt";
      else if (paidAmount >= total) payType = "cash";
      else payType = "split";
    } else {
      payType = "cash";
      paidAmount = total;
    }
  }
  const deliveryId = uid("elver");
  const acceptedAt = isFranchise ? new Date().toISOString() : null;
  const write = db.transaction(() => {
    db.prepare(
      "INSERT INTO eleman_deliveries (id, firm_id, eleman_id, branch_id, staff_id, total, status, channel, pay_type, paid_amount, accepted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      deliveryId,
      firmId,
      elemanId,
      branch.id,
      staff?.id || "",
      total,
      isFranchise ? "accepted" : "pending",
      isFranchise ? "franchise" : "branch",
      payType,
      paidAmount,
      acceptedAt
    );
    const insertLine = db.prepare(
      "INSERT INTO eleman_delivery_lines (id, delivery_id, product_id, name, qty, unit, price) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    for (const line of lines) {
      insertLine.run(uid("ell"), deliveryId, line.productId, line.name, line.qty, line.unit, line.price);
      addStock(db, firmId, elemanId, line.productId, line.unit, -line.qty);
    }
    if (isFranchise && paidAmount > 0) {
      insertElemanCash(db, {
        firmId,
        elemanId,
        direction: "in",
        amount: paidAmount,
        kind: "franchise",
        refId: deliveryId,
        note: payType === "split" ? `${branch.name} franchise nəğd hissə` : `${branch.name} franchise`,
        wallet: "franchise",
      });
    }
  });
  write();
  return mapDelivery(db, loadDeliveryRow(db, deliveryId));
}

export function listFranchiseDebts(db, firmId) {
  const branches = db
    .prepare("SELECT id, name FROM branches WHERE firm_id = ? AND kind = 'franchise' ORDER BY name")
    .all(firmId);
  return branches.map((branch) => {
    const sales = db
      .prepare(
        `SELECT d.*, p.first_name AS firstName, p.last_name AS lastName
         FROM eleman_deliveries d
         LEFT JOIN eleman_people p ON ${textEq(db, "p.id", "d.eleman_id")}
         WHERE d.firm_id = ? AND d.branch_id = ? AND d.channel = 'franchise'
         ORDER BY d.created_at DESC`
      )
      .all(firmId, branch.id)
      .map((row) => ({
        ...mapDelivery(db, row),
        elemanName: personName(row),
      }));
    const payments = db
      .prepare(
        `SELECT pay.id, pay.amount, pay.note, pay.created_at AS createdAt, pay.eleman_id AS elemanId,
                p.first_name AS firstName, p.last_name AS lastName
         FROM eleman_franchise_payments pay
         LEFT JOIN eleman_people p ON ${textEq(db, "p.id", "pay.eleman_id")}
         WHERE pay.branch_id = ?
         ORDER BY pay.created_at DESC`
      )
      .all(branch.id)
      .map((row) => ({
        id: row.id,
        amount: num(row.amount),
        note: row.note || "",
        createdAt: row.createdAt,
        elemanId: row.elemanId,
        elemanName: personName(row),
      }));
    const received = roundMoney(sales.reduce((sum, row) => sum + num(row.total), 0));
    const cashPaid = roundMoney(sales.reduce((sum, row) => sum + franchisePaidAmount(row), 0));
    const debtSales = roundMoney(sales.reduce((sum, row) => sum + franchiseDebtAmount(row), 0));
    const extraPaid = roundMoney(payments.reduce((sum, row) => sum + num(row.amount), 0));
    return {
      id: branch.id,
      name: branch.name,
      received,
      paid: roundMoney(cashPaid + extraPaid),
      debt: roundMoney(Math.max(0, debtSales - extraPaid)),
      cashPaid,
      extraPaid,
      sales,
      payments,
    };
  });
}

export function payFranchiseDebt(db, firmId, body) {
  const branch = db
    .prepare("SELECT id, name FROM branches WHERE id = ? AND firm_id = ? AND kind = 'franchise'")
    .get(body.branchId, firmId);
  if (!branch) throw new Error("Franchise şube bulunamadı");
  const amount = roundMoney(body.amount);
  if (amount <= 0) throw new Error("Məbləğ yazın");
  const row = listFranchiseDebts(db, firmId).find((item) => item.id === branch.id);
  if (!row || amount > row.debt + 0.001) throw new Error("Borc bu qədər deyil");
  let elemanId = String(body.elemanId || "");
  if (!elemanId) {
    elemanId = row.sales.find((item) => franchiseDebtAmount(item) > 0)?.elemanId || "";
  }
  if (!elemanId) throw new Error("Əlman tapılmadı");
  const person = db.prepare("SELECT id FROM eleman_people WHERE id = ? AND firm_id = ?").get(elemanId, firmId);
  if (!person) throw new Error("Əlman tapılmadı");
  const payId = uid("elfp");
  const write = db.transaction(() => {
    db.prepare(
      "INSERT INTO eleman_franchise_payments (id, firm_id, branch_id, eleman_id, amount, note) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(payId, firmId, branch.id, elemanId, amount, String(body.note || "").trim() || "Franchise borç ödənişi");
    insertElemanCash(db, {
      firmId,
      elemanId,
      direction: "in",
      amount,
      kind: "franchise_pay",
      refId: payId,
      note: `${branch.name} borç ödənişi`,
      wallet: "franchise",
    });
  });
  write();
  return listFranchiseDebts(db, firmId);
}

export function pendingStaffDeliveries(db, staffId, branchId) {
  return db
    .prepare(
      `SELECT d.*, b.name AS branchName, p.first_name AS firstName, p.last_name AS lastName
       FROM eleman_deliveries d
       LEFT JOIN branches b ON ${textEq(db, "b.id", "d.branch_id")}
       LEFT JOIN eleman_people p ON ${textEq(db, "p.id", "d.eleman_id")}
       WHERE d.staff_id = ? AND d.branch_id = ? AND d.status = 'pending'
       ORDER BY d.created_at DESC`
    )
    .all(staffId, branchId)
    .map((row) => ({
      ...mapDelivery(db, row),
      elemanName: personName(row),
    }));
}

export function acceptElemanDelivery(db, staffId, branchId, deliveryId) {
  const row = db
    .prepare(
      "SELECT * FROM eleman_deliveries WHERE id = ? AND staff_id = ? AND branch_id = ? AND status = 'pending'"
    )
    .get(deliveryId, staffId, branchId);
  if (!row) throw new Error("Təhvil tapılmadı");
  const acceptedAt = new Date().toISOString();
  db.prepare("UPDATE eleman_deliveries SET status = 'accepted', accepted_at = ? WHERE id = ?").run(acceptedAt, deliveryId);
  return mapDelivery(db, { ...row, status: "accepted", accepted_at: acceptedAt, branchName: "" });
}

export function updateElemanSelf(db, firmId, elemanId, body) {
  const existing = db
    .prepare("SELECT * FROM eleman_people WHERE id = ? AND firm_id = ? AND blocked = 0")
    .get(elemanId, firmId);
  if (!existing) throw new Error("Əlman tapılmadı");
  const login = body.login !== undefined ? normalizeLogin(body.login) : existing.login;
  const password = String(body.password || "");
  const currentPassword = String(body.currentPassword || "");
  if (!login) throw new Error("Login yazın");
  const loginChanged = login !== normalizeLogin(existing.login);
  if ((loginChanged || password) && !bcrypt.compareSync(currentPassword, existing.password_hash)) {
    throw new Error("Mövcud parol səhvdir");
  }
  if (loginChanged || password) {
    updateElemanPerson(db, firmId, elemanId, {
      firstName: existing.first_name,
      lastName: existing.last_name,
      phone: existing.phone,
      login,
      password,
    });
  }
  return db.prepare("SELECT * FROM eleman_people WHERE id = ?").get(elemanId);
}

export function publicElemanUser(row, firmName, currency) {
  return {
    id: row.id,
    email: row.login,
    firmId: row.firm_id,
    firmName,
    elemanId: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    staffName: personName(row),
    role: "eleman",
    loginType: "eleman",
    currency: currency || "AZN",
  };
}
