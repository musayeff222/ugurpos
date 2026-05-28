export const defaultPaymentMethods = [
  { id: "cash", name: "Nakit", active: true },
  { id: "pos", name: "POS / Kredi Kartı", active: true },
  { id: "open", name: "Açık Hesap", active: true },
  { id: "partial", name: "Parçalı Ödeme", active: true },
];

export const defaultGroups = [
  { id: "g1", name: "Gıda" },
  { id: "g2", name: "İçecek" },
  { id: "g3", name: "Temizlik" },
  { id: "g4", name: "Diğer" },
];

export const defaultFirms = [
  { id: "f1", name: "Metro Toptan", phone: "0312 000 0000", taxNo: "1234567890", balance: 0 },
  { id: "f2", name: "Anadolu Gıda", phone: "0212 000 0000", taxNo: "9876543210", balance: 1250 },
];

export const defaultStaff = [
  { id: "s1", name: "Admin", code: "ADM001", role: "Yönetici", active: true },
  { id: "s2", name: "Kasiyer 1", code: "KS001", role: "Kasiyer", active: true },
];

export const defaultProducts = [
  {
    id: "p1",
    barcode: "8690000000011",
    stockCode: "STK-001",
    name: "Ekmek",
    groupId: "g1",
    stock: 120,
    criticalStock: 20,
    vat: 1,
    buyPrice: 8,
    price1: 12,
    price2: 11,
    onSalePage: true,
    active: true,
  },
  {
    id: "p2",
    barcode: "8690000000028",
    stockCode: "STK-002",
    name: "Süt 1L",
    groupId: "g2",
    stock: 48,
    criticalStock: 10,
    vat: 1,
    buyPrice: 28,
    price1: 38,
    price2: 36,
    onSalePage: true,
    active: true,
  },
  {
    id: "p3",
    barcode: "8690000000035",
    stockCode: "STK-003",
    name: "Su 1.5L",
    groupId: "g2",
    stock: 96,
    criticalStock: 24,
    vat: 1,
    buyPrice: 4,
    price1: 8,
    price2: 7,
    onSalePage: true,
    active: true,
  },
  {
    id: "p4",
    barcode: "8690000000042",
    stockCode: "STK-004",
    name: "Deterjan 3kg",
    groupId: "g3",
    stock: 15,
    criticalStock: 5,
    vat: 20,
    buyPrice: 145,
    price1: 199,
    price2: 189,
    onSalePage: true,
    active: true,
  },
  {
    id: "p5",
    barcode: "8690000000059",
    stockCode: "STK-005",
    name: "Yumurta 15li",
    groupId: "g1",
    stock: 30,
    criticalStock: 8,
    vat: 1,
    buyPrice: 75,
    price1: 95,
    price2: 92,
    onSalePage: true,
    active: true,
  },
];

export const defaultCustomers = [
  {
    id: "c1",
    name: "Perakende Müşteri",
    phone: "",
    address: "",
    note: "",
    creditLimit: 0,
    debt: 0,
    purchaseCount: 0,
    lastPaymentDate: null,
  },
  {
    id: "c2",
    name: "Ahmet Market",
    phone: "5320000001",
    address: "Ankara",
    note: "Veresiye müşteri",
    creditLimit: 5000,
    debt: 850,
    purchaseCount: 12,
    lastPaymentDate: "2026-05-20",
  },
  {
    id: "c3",
    name: "Mehmet Bakkal",
    phone: "5330000002",
    address: "İstanbul",
    note: "",
    creditLimit: 3000,
    debt: 0,
    purchaseCount: 5,
    lastPaymentDate: "2026-05-15",
  },
];

export const defaultIncomeTypes = [
  { id: "it1", name: "Ek Satış Geliri" },
  { id: "it2", name: "Faiz Geliri" },
];

export const defaultExpenseTypes = [
  { id: "et1", name: "Kira" },
  { id: "et2", name: "Elektrik" },
  { id: "et3", name: "Personel Maaşı" },
];

export const defaultTasks = [
  { id: "t1", title: "Stok sayımı yap", status: "open", assignee: "Admin", dueDate: "2026-05-30" },
  { id: "t2", title: "Yeni ürün fiyatlarını güncelle", status: "done", assignee: "Kasiyer 1", dueDate: "2026-05-25" },
];

export const defaultNotices = [
  { id: "n1", title: "E-posta İle Satış Performans Raporu", read: false, date: "2026-05-20" },
  { id: "n2", title: "İki Faktörlü Doğrulama (2FA) Yayınlandı", read: false, date: "2026-05-18" },
  { id: "n3", title: "Ürün Bazlı İskonto", read: true, date: "2026-05-10" },
];

export function createDefaultState() {
  return {
    products: defaultProducts,
    customers: defaultCustomers,
    sales: [],
    groups: defaultGroups,
    firms: defaultFirms,
    staff: defaultStaff,
    paymentMethods: defaultPaymentMethods,
    income: [],
    expense: [],
    incomeTypes: defaultIncomeTypes,
    expenseTypes: defaultExpenseTypes,
    tasks: defaultTasks,
    notices: defaultNotices,
    stockCounts: [],
    purchaseInvoices: [],
    eInvoices: [],
    integrations: [
      { id: "i1", name: "E-Fatura", status: "inactive", description: "E-fatura entegrasyonu" },
      { id: "i2", name: "Yazarkasa", status: "inactive", description: "ÖKC entegrasyonu" },
    ],
    refundRequests: [],
    variants: [],
    subProducts: [],
  };
}
