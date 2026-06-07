import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initSchema } from "./schema.js";
import { ensureDefaultBranch, rowToBranch } from "./migrate-branches.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDataDir() {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  if (process.env.VERCEL) return path.join("/tmp", "ugurpos");
  return path.join(__dirname, "..", "data");
}

const DATA_DIR = resolveDataDir();
const DB_PATH = path.join(DATA_DIR, "benimpos.db");

let db;

export function getDb() {
  if (!db) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initSchema(db);
    seedIfEmpty(db);
  }
  return db;
}

export function getDataDir() {
  getDb();
  return DATA_DIR;
}

export function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function seedIfEmpty(database) {
  const userCount = database.prepare("SELECT COUNT(*) as c FROM users").get().c;
  if (userCount > 0) return;

  const firmId = "U261269153";
  const branch = ensureDefaultBranch(database, firmId, "ANA HESAP");
  const branchId = branch.id;

  const hash = bcrypt.hashSync("admin123", 10);
  database.prepare(
    "INSERT INTO users (id, email, password_hash, firm_id, firm_name, branch, role, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run("u1", "admin@benimpos.com", hash, firmId, "SMARTADMİN", "ANA HESAP", "admin", branchId);

  const groups = [
    ["g1", "Gıda"],
    ["g2", "İçecek"],
    ["g3", "Temizlik"],
    ["g4", "Diğer"],
  ];
  const insGroup = database.prepare("INSERT INTO groups (id, name, branch_id) VALUES (?, ?, ?)");
  groups.forEach((g) => insGroup.run(g[0], g[1], branchId));

  const products = [
    ["p1", "8690000000011", "STK-001", "Ekmek", "g1", 120, 20, 1, 8, 12, 11, "Adet"],
    ["p2", "8690000000028", "STK-002", "Süt 1L", "g2", 48, 10, 1, 28, 38, 36, "Litre"],
    ["p3", "8690000000035", "STK-003", "Su 1.5L", "g2", 96, 24, 1, 4, 8, 7, "Litre"],
    ["p4", "8690000000042", "STK-004", "Deterjan 3kg", "g3", 15, 5, 20, 145, 199, 189, "KG"],
    ["p5", "8690000000059", "STK-005", "Yumurta 15li", "g1", 30, 8, 1, 75, 95, 92, "Paket"],
  ];
  const insProduct = database.prepare(`
    INSERT INTO products (id, barcode, stock_code, name, group_id, stock, critical_stock, vat, buy_price, price1, price2, unit, on_sale_page, active, branch_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
  `);
  products.forEach((p) => insProduct.run(...p, branchId));

  database.prepare(`
    INSERT INTO customers (id, name, phone, address, note, credit_limit, debt, purchase_count, last_payment_date, branch_id)
    VALUES ('c1', 'Perakende Müşteri', '', '', '', 0, 0, 0, NULL, ?),
           ('c2', 'Ahmet Market', '5320000001', 'Ankara', 'Veresiye müşteri', 5000, 850, 12, '2026-05-20', ?),
           ('c3', 'Mehmet Bakkal', '5330000002', 'İstanbul', '', 3000, 0, 5, '2026-05-15', ?)
  `).run(branchId, branchId, branchId);

  database.prepare(`
    INSERT INTO staff (id, name, code, role, active, branch_id) VALUES
    ('s1', 'Admin', 'ADM001', 'Yönetici', 1, ?),
    ('s2', 'Kasiyer 1', 'KS001', 'Kasiyer', 1, ?)
  `).run(branchId, branchId);

  database.prepare(`
    INSERT INTO firms (id, name, phone, tax_no, balance, branch_id) VALUES
    ('f1', 'Metro Toptan', '0312 000 0000', '1234567890', 0, ?),
    ('f2', 'Anadolu Gıda', '0212 000 0000', '9876543210', 1250, ?)
  `).run(branchId, branchId);

  database.prepare(`
    INSERT INTO payment_methods (id, name, active, branch_id) VALUES
    ('pm1', 'Nakit', 1, ?), ('pm2', 'POS / Kredi Kartı', 1, ?),
    ('pm3', 'Açık Hesap', 1, ?), ('pm4', 'Parçalı Ödeme', 1, ?)
  `).run(branchId, branchId, branchId, branchId);

  database.prepare(`
    INSERT INTO income_types (id, name, branch_id) VALUES ('it1', 'Ek Satış Geliri', ?), ('it2', 'Faiz Geliri', ?)
  `).run(branchId, branchId);
  database.prepare(`
    INSERT INTO expense_types (id, name, branch_id) VALUES ('et1', 'Kira', ?), ('et2', 'Elektrik', ?), ('et3', 'Personel Maaşı', ?)
  `).run(branchId, branchId, branchId);

  database.prepare(`
    INSERT INTO tasks (id, title, status, assignee, due_date, branch_id) VALUES
    ('t1', 'Stok sayımı yap', 'open', 'Admin', '2026-05-30', ?),
    ('t2', 'Yeni ürün fiyatlarını güncelle', 'done', 'Kasiyer 1', '2026-05-25', ?)
  `).run(branchId, branchId);

  database.prepare(`
    INSERT INTO notices (id, title, read_flag, date, branch_id) VALUES
    ('n1', 'E-posta İle Satış Performans Raporu', 0, '2026-05-20', ?),
    ('n2', 'İki Faktörlü Doğrulama (2FA) Yayınlandı', 0, '2026-05-18', ?),
    ('n3', 'Ürün Bazlı İskonto', 1, '2026-05-10', ?)
  `).run(branchId, branchId, branchId);

  database.prepare(`
    INSERT INTO integrations (id, name, status, description, branch_id) VALUES
    ('i1', 'E-Fatura', 'inactive', 'E-fatura entegrasyonu', ?),
    ('i2', 'Yazarkasa', 'inactive', 'ÖKC entegrasyonu', ?)
  `).run(branchId, branchId);

  console.log("Database seeded. Admin: admin@benimpos.com / admin123 | Şube varsayılan parola: sube123");
}

export function rowToProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    barcode: row.barcode,
    stockCode: row.stock_code,
    name: row.name,
    groupId: row.group_id,
    stock: row.stock,
    criticalStock: row.critical_stock,
    vat: row.vat,
    buyPrice: row.buy_price,
    price1: row.price1,
    price2: row.price2,
    unit: row.unit || "Adet",
    onSalePage: !!row.on_sale_page,
    active: !!row.active,
    hasImage: !!row.image_path,
    imageUrl: row.image_path ? `/api/products/${row.id}/image` : null,
  };
}

export function rowToCustomer(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || "",
    address: row.address || "",
    note: row.note || "",
    creditLimit: row.credit_limit,
    debt: row.debt,
    purchaseCount: row.purchase_count,
    lastPaymentDate: row.last_payment_date,
  };
}

export function getSaleWithItems(database, saleId) {
  const sale = database.prepare("SELECT * FROM sales WHERE id = ?").get(saleId);
  if (!sale) return null;
  const items = database.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(saleId);
  return {
    id: sale.id,
    code: sale.code,
    createdAt: sale.created_at,
    paymentType: sale.payment_type,
    customerId: sale.customer_id,
    staffName: sale.staff_name,
    note: sale.note || "",
    discount: sale.discount,
    discountType: sale.discount_type,
    paidAmount: sale.paid_amount,
    total: sale.total,
    items: items.map((i) => ({
      id: i.id,
      productId: i.product_id,
      name: i.name,
      qty: i.qty,
      price: i.price,
      discount: i.discount,
      note: i.note || "",
    })),
  };
}

export function getAllState(database, branchId) {
  if (!branchId) {
    return {
      products: [],
      customers: [],
      sales: [],
      groups: [],
      firms: [],
      staff: [],
      paymentMethods: [],
      income: [],
      expense: [],
      incomeTypes: [],
      expenseTypes: [],
      tasks: [],
      notices: [],
      stockCounts: [],
      purchaseInvoices: [],
      refundRequests: [],
      integrations: [],
      variants: [],
      subProducts: [],
      eInvoices: [],
    };
  }

  const products = database
    .prepare("SELECT * FROM products WHERE branch_id = ? ORDER BY name")
    .all(branchId)
    .map(rowToProduct);
  const customers = database
    .prepare("SELECT * FROM customers WHERE branch_id = ? ORDER BY name")
    .all(branchId)
    .map(rowToCustomer);
  const sales = database
    .prepare("SELECT id FROM sales WHERE branch_id = ? ORDER BY created_at DESC")
    .all(branchId)
    .map((r) => getSaleWithItems(database, r.id));
  const groups = database
    .prepare("SELECT * FROM groups WHERE branch_id = ? ORDER BY name")
    .all(branchId)
    .map((r) => ({ id: r.id, name: r.name }));
  const firms = database
    .prepare("SELECT * FROM firms WHERE branch_id = ? ORDER BY name")
    .all(branchId)
    .map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone || "",
      taxNo: r.tax_no || "",
      balance: r.balance,
    }));
  const staff = database
    .prepare("SELECT * FROM staff WHERE branch_id = ? ORDER BY name")
    .all(branchId)
    .map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code || "",
      role: r.role || "",
      active: !!r.active,
    }));
  const paymentMethods = database
    .prepare("SELECT * FROM payment_methods WHERE branch_id = ?")
    .all(branchId)
    .map((r) => ({
      id: r.id,
      name: r.name,
      active: !!r.active,
    }));
  const income = database
    .prepare("SELECT * FROM income_entries WHERE branch_id = ? ORDER BY date DESC")
    .all(branchId)
    .map((r) => ({
      id: r.id,
      title: r.title,
      amount: r.amount,
      typeId: r.type_id,
      date: r.date,
    }));
  const expense = database
    .prepare("SELECT * FROM expense_entries WHERE branch_id = ? ORDER BY date DESC")
    .all(branchId)
    .map((r) => ({
      id: r.id,
      title: r.title,
      amount: r.amount,
      typeId: r.type_id,
      date: r.date,
    }));
  const incomeTypes = database
    .prepare("SELECT * FROM income_types WHERE branch_id = ?")
    .all(branchId)
    .map((r) => ({ id: r.id, name: r.name }));
  const expenseTypes = database
    .prepare("SELECT * FROM expense_types WHERE branch_id = ?")
    .all(branchId)
    .map((r) => ({ id: r.id, name: r.name }));
  const tasks = database
    .prepare("SELECT * FROM tasks WHERE branch_id = ? ORDER BY due_date DESC")
    .all(branchId)
    .map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      assignee: r.assignee || "",
      dueDate: r.due_date || "",
    }));
  const notices = database
    .prepare("SELECT * FROM notices WHERE branch_id = ? ORDER BY date DESC")
    .all(branchId)
    .map((r) => ({
      id: r.id,
      title: r.title,
      read: !!r.read_flag,
      date: r.date,
    }));
  const stockCounts = database
    .prepare("SELECT * FROM stock_counts WHERE branch_id = ? ORDER BY date DESC")
    .all(branchId)
    .map((r) => ({
      id: r.id,
      productId: r.product_id,
      productName: r.product_name,
      previous: r.previous_stock,
      counted: r.counted,
      difference: r.difference,
      note: r.note || "",
      date: r.date,
    }));
  const purchaseInvoices = database
    .prepare("SELECT * FROM purchase_invoices WHERE branch_id = ? ORDER BY date DESC")
    .all(branchId)
    .map((r) => ({
      id: r.id,
      invoiceNo: r.invoice_no,
      firmId: r.firm_id,
      firmName: r.firm_name || "",
      total: r.total,
      date: r.date,
    }));
  const refundRequests = database
    .prepare("SELECT * FROM refund_requests WHERE branch_id = ? ORDER BY date DESC")
    .all(branchId)
    .map((r) => ({
      id: r.id,
      productName: r.product_name || "",
      reason: r.reason || "",
      status: r.status,
      date: r.date,
    }));
  const integrations = database
    .prepare("SELECT * FROM integrations WHERE branch_id = ?")
    .all(branchId)
    .map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      description: r.description || "",
    }));
  const variants = database
    .prepare("SELECT * FROM variants WHERE branch_id = ?")
    .all(branchId)
    .map((r) => ({
      id: r.id,
      productId: r.product_id,
      name: r.name,
      sku: r.sku || "",
      price: r.price,
      stock: r.stock,
    }));
  const subProducts = database
    .prepare("SELECT * FROM sub_products WHERE branch_id = ?")
    .all(branchId)
    .map((r) => ({
      id: r.id,
      parentProductId: r.parent_product_id,
      name: r.name,
      qty: r.qty,
    }));
  const eInvoices = database
    .prepare("SELECT * FROM e_invoices WHERE branch_id = ? ORDER BY date DESC")
    .all(branchId)
    .map((r) => ({
      id: r.id,
      direction: r.direction,
      invoiceNo: r.invoice_no || "",
      customerName: r.customer_name || "",
      total: r.total,
      status: r.status,
      date: r.date,
    }));

  return {
    products,
    customers,
    sales,
    groups,
    firms,
    staff,
    paymentMethods,
    income,
    expense,
    incomeTypes,
    expenseTypes,
    tasks,
    notices,
    stockCounts,
    purchaseInvoices,
    refundRequests,
    integrations,
    variants,
    subProducts,
    eInvoices,
  };
}

export { rowToBranch };
