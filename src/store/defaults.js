export const defaultPaymentMethods = [
  { id: "cash", name: "Nakit", active: true },
  { id: "pos", name: "POS / Kredi Kartı", active: true },
  { id: "open", name: "Açık Hesap", active: true },
  { id: "partial", name: "Parçalı Ödeme", active: true },
];

export const defaultGroups = [{ id: "g_cigkofte", name: "Çiğköfte" }];

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
    id: "p_ckf_1",
    barcode: "8690000100001",
    stockCode: "CKF-DURUM-100",
    name: "Dürüm 100 gr",
    groupId: "g_cigkofte",
    stock: 999,
    criticalStock: 10,
    vat: 0,
    buyPrice: 1.5,
    price1: 3,
    price2: 3,
    onSalePage: true,
    active: true,
  },
  {
    id: "p_ckf_2",
    barcode: "8690000100002",
    stockCode: "CKF-SPECIAL-159",
    name: "Spaciel Dürüm 159 gr",
    groupId: "g_cigkofte",
    stock: 999,
    criticalStock: 10,
    vat: 0,
    buyPrice: 2.5,
    price1: 5,
    price2: 5,
    onSalePage: true,
    active: true,
  },
  {
    id: "p_ckf_3",
    barcode: "8690000100003",
    stockCode: "CKF-PORS-250",
    name: "1 Porsiyon 250 gr Çiğköfte",
    groupId: "g_cigkofte",
    stock: 999,
    criticalStock: 10,
    vat: 0,
    buyPrice: 3,
    price1: 6,
    price2: 6,
    onSalePage: true,
    active: true,
  },
  {
    id: "p_ckf_4",
    barcode: "8690000100004",
    stockCode: "CKF-500",
    name: "Çiğköfte 500 gr",
    groupId: "g_cigkofte",
    stock: 999,
    criticalStock: 5,
    vat: 0,
    buyPrice: 6,
    price1: 12,
    price2: 12,
    onSalePage: true,
    active: true,
  },
  {
    id: "p_ckf_5",
    barcode: "8690000100005",
    stockCode: "CKF-750",
    name: "Çiğköfte 750 gr",
    groupId: "g_cigkofte",
    stock: 999,
    criticalStock: 5,
    vat: 0,
    buyPrice: 9,
    price1: 18,
    price2: 18,
    onSalePage: true,
    active: true,
  },
  {
    id: "p_ckf_6",
    barcode: "8690000100006",
    stockCode: "CKF-1000",
    name: "Çiğköfte 1 kg",
    groupId: "g_cigkofte",
    stock: 999,
    criticalStock: 5,
    vat: 0,
    buyPrice: 12,
    price1: 24,
    price2: 24,
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
