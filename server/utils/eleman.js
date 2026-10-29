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

export function elemanBalance(db, elemanId) {
  const inn = num(
    db.prepare("SELECT COALESCE(SUM(amount), 0) AS t FROM eleman_cash WHERE eleman_id = ? AND direction = 'in'").get(
      elemanId
    )?.t
  );
  const out = num(
    db.prepare("SELECT COALESCE(SUM(amount), 0) AS t FROM eleman_cash WHERE eleman_id = ? AND direction = 'out'").get(
      elemanId
    )?.t
  );
  return roundMoney(inn - out);
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

function mapDelivery(db, row) {
  return {
    id: row.id,
    elemanId: row.eleman_id,
    branchId: row.branch_id,
    branchName: row.branchName || row.branch_name || "",
    staffId: row.staff_id,
    staffName: `${row.staffName || row.staff_name || ""} ${row.staffSurname || row.staff_surname || ""}`.trim(),
    total: num(row.total),
    status: row.status,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at || "",
    lines: deliveryLines(db, row.id),
  };
}

export function listElemanProducts(db, firmId) {
  ensureElemanCatalog(db, firmId);
  return db
    .prepare(
      "SELECT id, name, unit, price, sort_no AS sortNo, active FROM eleman_products WHERE firm_id = ? ORDER BY sort_no, name"
    )
    .all(firmId)
    .map((row) => ({
      ...row,
      price: num(row.price),
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
  const active = body.active === false || body.active === 0 ? 0 : 1;
  db.prepare("UPDATE eleman_products SET name = ?, unit = ?, price = ?, active = ? WHERE id = ? AND firm_id = ?").run(
    name,
    unit,
    price,
    active,
    id,
    firmId
  );
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
      purchaseTotal: num(
        db.prepare("SELECT COALESCE(SUM(total), 0) AS t FROM eleman_purchases WHERE eleman_id = ?").get(row.id)?.t
      ),
      deliveryTotal: num(
        db
          .prepare("SELECT COALESCE(SUM(total), 0) AS t FROM eleman_deliveries WHERE eleman_id = ? AND status = 'accepted'")
          .get(row.id)?.t
      ),
    })
  );
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
      purchaseTotal: purchases.reduce((sum, item) => sum + item.total, 0),
      deliveryTotal: accepted.reduce((sum, item) => sum + item.total, 0),
    }),
    purchases,
    deliveries,
    stock,
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
  db.prepare(
    "INSERT INTO eleman_cash (id, firm_id, eleman_id, direction, amount, kind, ref_id, note) VALUES (?, ?, ?, 'in', ?, 'deposit', ?, ?)"
  ).run(uid("elc"), firmId, id, amount, id, String(body.note || "").trim() || "Kassa artırıldı");
  return { balance: elemanBalance(db, id), name: personName(person) };
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
  const withStock = products.map((product) => ({
    ...product,
    stock: stockQty(db, elemanId, product.id, product.unit),
    unitCost: stockCost(db, elemanId, product.id, product.unit),
  }));
  const branches = db
    .prepare(
      "SELECT id, name FROM branches WHERE firm_id = ? AND active = 1 AND (kind IS NULL OR kind = '' OR kind != 'production') ORDER BY name"
    )
    .all(firmId);
  return {
    person,
    balance: person.balance,
    products: withStock,
    branches,
    purchases: person.purchases,
    deliveries: person.deliveries,
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
      } else if (options.useStockCost) {
        price = stockCost(db, options.elemanId, product.id, unit);
        if (price <= 0) {
          throw new Error(`${product.name} üçün alış qiyməti yoxdur. Əvvəl alış edin.`);
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
    db.prepare(
      "INSERT INTO eleman_cash (id, firm_id, eleman_id, direction, amount, kind, ref_id, note) VALUES (?, ?, ?, 'out', ?, 'purchase', ?, ?)"
    ).run(uid("elc"), firmId, elemanId, total, purchaseId, "Alış");
  });
  write();
  return mapPurchase(db, db.prepare("SELECT * FROM eleman_purchases WHERE id = ?").get(purchaseId));
}

export function createElemanDelivery(db, firmId, elemanId, body) {
  const person = db.prepare("SELECT id FROM eleman_people WHERE id = ? AND firm_id = ? AND blocked = 0").get(
    elemanId,
    firmId
  );
  if (!person) throw new Error("Əlman tapılmadı");
  const branch = db.prepare("SELECT id, name FROM branches WHERE id = ? AND firm_id = ? AND active = 1").get(
    body.branchId,
    firmId
  );
  if (!branch) throw new Error("Filial seçin");
  const staff = db
    .prepare("SELECT id, name, surname FROM staff WHERE id = ? AND branch_id = ? AND active = 1")
    .get(body.staffId, branch.id);
  if (!staff) throw new Error("Kassir seçin");
  const lines = parseLines(db, firmId, body.lines, { useStockCost: true, elemanId });
  if (!lines.length) throw new Error("Məhsul seçin");
  for (const line of lines) {
    const have = stockQty(db, elemanId, line.productId, line.unit);
    if (line.qty > have + 0.0001) {
      throw new Error(`${line.name} üçün anbarda kifayət qədər məhsul yoxdur`);
    }
  }
  const total = roundMoney(lines.reduce((sum, line) => sum + line.qty * line.price, 0));
  const deliveryId = uid("elver");
  const write = db.transaction(() => {
    db.prepare(
      "INSERT INTO eleman_deliveries (id, firm_id, eleman_id, branch_id, staff_id, total, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')"
    ).run(deliveryId, firmId, elemanId, branch.id, staff.id, total);
    const insertLine = db.prepare(
      "INSERT INTO eleman_delivery_lines (id, delivery_id, product_id, name, qty, unit, price) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    for (const line of lines) {
      insertLine.run(uid("ell"), deliveryId, line.productId, line.name, line.qty, line.unit, line.price);
      addStock(db, firmId, elemanId, line.productId, line.unit, -line.qty);
    }
  });
  write();
  return mapDelivery(
    db,
    db
      .prepare(
        `SELECT d.*, b.name AS branchName, s.name AS staffName, s.surname AS staffSurname
         FROM eleman_deliveries d
         LEFT JOIN branches b ON ${textEq(db, "b.id", "d.branch_id")}
         LEFT JOIN staff s ON ${textEq(db, "s.id", "d.staff_id")}
         WHERE d.id = ?`
      )
      .get(deliveryId)
  );
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
