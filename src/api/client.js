import { getBranchSyncToken, isDesktopApp } from "../offline/staffRoster";

const TOKEN_KEY = "benimpos_token";
const USER_KEY = "benimpos_user";
export const OFFLINE_SESSION_TOKEN = "offline-session";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function requestToken() {
  const session = getToken();
  if (session && session !== OFFLINE_SESSION_TOKEN) return session;
  return getBranchSyncToken();
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (isDesktopApp()) headers["X-Ugurpos-Desktop"] = "1";
  const token = requestToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`/api${path}`, { ...options, headers });
  } catch (cause) {
    const err = new Error(cause?.message || "Şəbəkə yoxdur");
    err.status = 0;
    err.offline = true;
    throw err;
  }
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || res.statusText || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  branchLogin: (email, password) =>
    request("/auth/branch-login", { method: "POST", body: JSON.stringify({ email, password }) }),

  staffLogin: (payload) =>
    request("/auth/staff-login", { method: "POST", body: JSON.stringify(payload) }),

  getOfflineStaff: () => request("/auth/offline-staff"),

  openStaffShift: (payload) =>
    request("/staff/shifts/open", { method: "POST", body: JSON.stringify(payload) }),

  closeStaffShift: (payload) =>
    request("/staff/shifts/close", { method: "POST", body: JSON.stringify(payload) }),

  getStaffForLogin: (branchEmail) =>
    request(`/auth/staff-for-login?branchEmail=${encodeURIComponent(branchEmail)}`),

  getBranches: () => request("/auth/branches"),

  getAdminSummary: () => request("/admin/summary"),
  getAdminBranches: () => request("/admin/branches"),
  getAdminBranch: (id) => request(`/admin/branches/${id}`),
  getAdminBranchActivity: (id) => request(`/admin/branches/${id}/activity`),
  getAdminBranchWorkspace: (id, params = {}) => {
    const q = new URLSearchParams();
    if (params.date) q.set("date", params.date);
    const qs = q.toString();
    return request(`/admin/branches/${id}/workspace${qs ? `?${qs}` : ""}`);
  },
  updateAdminBranchProduct: (branchId, productId, patch) =>
    request(`/admin/branches/${branchId}/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteAdminBranchProduct: (branchId, productId) =>
    request(`/admin/branches/${branchId}/products/${productId}`, { method: "DELETE" }),
  updateAdminBranchStaff: (branchId, staffId, patch) =>
    request(`/admin/branches/${branchId}/staff/${staffId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  enterBranchAsAdmin: (id) => request(`/admin/branches/${id}/enter`, { method: "POST" }),
  impersonateAdminStaff: (id) => request(`/admin/staff/${id}/impersonate`, { method: "POST" }),
  createBranch: (branch) => request("/admin/branches", { method: "POST", body: JSON.stringify(branch) }),
  updateBranch: (id, patch) => request(`/admin/branches/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteBranch: (id) => request(`/admin/branches/${id}`, { method: "DELETE" }),

  getProductionRawMaterials: () => request("/production/raw-materials"),
  createProductionRawMaterial: (payload) =>
    request("/production/raw-materials", { method: "POST", body: JSON.stringify(payload) }),
  updateProductionRawMaterial: (id, payload) =>
    request(`/production/raw-materials/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  addProductionRawStock: (id, payload) =>
    request(`/production/raw-materials/${id}/stock`, { method: "POST", body: JSON.stringify(payload) }),
  getProductionRawMovements: (id) => request(`/production/raw-materials/${id}/movements`),
  deleteProductionRawMaterial: (id) => request(`/production/raw-materials/${id}`, { method: "DELETE" }),
  getProductionSummary: () => request("/production/summary"),
  getProductionProducts: () => request("/production/products"),
  createProductionProduct: (payload) =>
    request("/production/products", { method: "POST", body: JSON.stringify(payload) }),
  deleteProductionProduct: (id) => request(`/production/products/${id}`, { method: "DELETE" }),
  markProductionProductReady: (id, payload) =>
    request(`/production/products/${id}/ready`, { method: "POST", body: JSON.stringify(payload) }),
  getProductionReady: () => request("/production/ready"),
  getProductionSalesBranches: () => request("/production/sales-branches"),
  transferProductionProduct: (payload) =>
    request("/production/transfer", { method: "POST", body: JSON.stringify(payload) }),
  getProductionWarehouse: () => request("/production/warehouse"),
  createProductionWarehouseItem: (payload) =>
    request("/production/warehouse", { method: "POST", body: JSON.stringify(payload) }),
  addProductionWarehouseStock: (id, payload) =>
    request(`/production/warehouse/${id}/stock`, { method: "POST", body: JSON.stringify(payload) }),
  deleteProductionWarehouseItem: (id) => request(`/production/warehouse/${id}`, { method: "DELETE" }),
  getProductionWarehouseBranches: () => request("/production/warehouse/branches"),
  transferProductionWarehouseItem: (payload) =>
    request("/production/warehouse/transfer", { method: "POST", body: JSON.stringify(payload) }),
  getProductionProductHistory: (id) => request(`/production/products/${id}/history`),
  getProductionBatches: () => request("/production/batches"),
  createProductionBatch: (payload) =>
    request("/production/batches", { method: "POST", body: JSON.stringify(payload) }),
  getBranchNotifications: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/notifications${q ? `?${q}` : ""}`);
  },
  markBranchNotificationsRead: (payload = {}) =>
    request("/notifications/read", { method: "POST", body: JSON.stringify(payload) }),
  getAdminStaff: () => request("/admin/staff"),
  createAdminStaff: (payload) => request("/admin/staff", { method: "POST", body: JSON.stringify(payload) }),
  updateAdminStaff: (id, payload) =>
    request(`/admin/staff/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteAdminStaff: (id) => request(`/admin/staff/${id}`, { method: "DELETE" }),
  endStaffShift: () => request("/staff/end-shift", { method: "POST", body: JSON.stringify({}) }),

  getAdminActivity: () => request("/admin/activity"),
  getAdminActivityPoll: (after) =>
    request(`/admin/activity/poll${after ? `?after=${encodeURIComponent(after)}` : ""}`),
  getAdminCashWithdrawals: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/cash-withdrawals${q ? `?${q}` : ""}`);
  },
  updateAdminCashWithdrawal: (id, payload) =>
    request(`/admin/cash-withdrawals/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteAdminCashWithdrawal: (id) =>
    request(`/admin/cash-withdrawals/${id}`, { method: "DELETE" }),
  getAdminBusinessDayReports: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/business-day-reports${q ? `?${q}` : ""}`);
  },
  changeAdminPassword: (payload) =>
    request("/admin/account/password", { method: "PATCH", body: JSON.stringify(payload) }),
  updateAdminAccount: (payload) =>
    request("/admin/account", { method: "PATCH", body: JSON.stringify(payload) }),

  getAdminPaymentMethods: () => request("/admin/payment-methods"),
  createAdminPaymentMethod: (payload) =>
    request("/admin/payment-methods", { method: "POST", body: JSON.stringify(payload) }),
  updateAdminPaymentMethod: (id, payload) =>
    request(`/admin/payment-methods/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteAdminPaymentMethod: (id) => request(`/admin/payment-methods/${id}`, { method: "DELETE" }),

  getAccounting: () => request("/admin/accounting"),
  createWholesaler: (payload) => request("/admin/accounting/wholesalers", { method: "POST", body: JSON.stringify(payload) }),
  createAccountKassa: (payload) => request("/admin/accounting/kassas", { method: "POST", body: JSON.stringify(payload) }),
  createAccountPurchase: (payload) =>
    request("/admin/accounting/purchases", { method: "POST", body: JSON.stringify(payload) }),
  payAccountDebt: (payload) => request("/admin/accounting/debts/pay", { method: "POST", body: JSON.stringify(payload) }),
  pullBranchCash: (payload) => request("/admin/accounting/pull", { method: "POST", body: JSON.stringify(payload) }),

  getAdminCatalogGroups: () => request("/admin/catalog/groups"),
  createAdminCatalogGroup: (name) =>
    request("/admin/catalog/groups", { method: "POST", body: JSON.stringify({ name }) }),
  updateAdminCatalogGroup: (id, name) =>
    request(`/admin/catalog/groups/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  deleteAdminCatalogGroup: (id) => request(`/admin/catalog/groups/${id}`, { method: "DELETE" }),
  getAdminProductionIngredients: async () => {
    const data = await request("/admin/catalog/production-ingredients");
    if (Array.isArray(data)) return { production: data, catalog: [] };
    return {
      production: data?.production || [],
      catalog: data?.catalog || [],
    };
  },
  getAdminCatalogProducts: () => request("/admin/catalog/products"),
  createAdminCatalogProduct: (product) =>
    request("/admin/catalog/products", { method: "POST", body: JSON.stringify(product) }),
  updateAdminCatalogProduct: (id, patch) =>
    request(`/admin/catalog/products/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteAdminCatalogProduct: (id) => request(`/admin/catalog/products/${id}`, { method: "DELETE" }),
  uploadAdminCatalogImage: async (id, file) => {
    const form = new FormData();
    form.append("image", file);
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`/api/admin/catalog/products/${id}/image-file`, { method: "POST", headers, body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || res.statusText || "Resim yüklenemedi");
      err.status = res.status;
      throw err;
    }
    return data;
  },

  getAdminCurrency: () => request("/admin/currency"),
  updateAdminCurrency: (currency) =>
    request("/admin/currency", { method: "PATCH", body: JSON.stringify({ currency }) }),
  getDisplayCurrency: () => request("/currency"),
  getAdminQrMenu: () => request("/admin/qr-menu"),
  updateAdminQrMenu: (patch) =>
    request("/admin/qr-menu", { method: "PATCH", body: JSON.stringify(patch) }),
  updateAdminQrMenuBranch: (id, patch) =>
    request(`/admin/qr-menu/branches/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  getAdminQrOrders: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/qr-orders${q ? `?${q}` : ""}`);
  },
  updateAdminQrOrder: (id, status) =>
    request(`/admin/qr-orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),

  getQrOrders: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/qr-orders${q ? `?${q}` : ""}`);
  },
  updateQrOrder: (id, status) =>
    request(`/qr-orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),

  getState: () => request("/state"),

  getDashboard: () => request("/dashboard/summary"),

  getProducts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/products${q ? `?${q}` : ""}`);
  },

  createProduct: (product) => request("/products", { method: "POST", body: JSON.stringify(product) }),
  updateProduct: (id, patch) => request(`/products/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  uploadProductImage: async (id, file) => {
    const form = new FormData();
    form.append("image", file);
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`/api/products/${id}/image-file`, { method: "POST", headers, body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || res.statusText || "Resim yuklenemedi");
      err.status = res.status;
      throw err;
    }
    return data;
  },
  deleteProducts: (ids) => request("/products", { method: "DELETE", body: JSON.stringify({ ids }) }),

  getGroups: () => request("/groups"),
  createGroup: (name) => request("/groups", { method: "POST", body: JSON.stringify({ name }) }),
  deleteGroup: (id) => request(`/groups/${id}`, { method: "DELETE" }),

  getCustomers: () => request("/customers"),
  createCustomer: (customer) => request("/customers", { method: "POST", body: JSON.stringify(customer) }),
  updateCustomer: (id, patch) => request(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: "DELETE" }),
  addCustomerPayment: (id, amount) =>
    request(`/customers/${id}/payments`, { method: "POST", body: JSON.stringify({ amount }) }),

  getSales: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/sales${q ? `?${q}` : ""}`);
  },
  createSale: (sale) => request("/sales", { method: "POST", body: JSON.stringify(sale) }),
  updateSale: (id, patch) => request(`/sales/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteSale: (id) => request(`/sales/${id}`, { method: "DELETE" }),
  createRefund: (data) => request("/refunds", { method: "POST", body: JSON.stringify(data) }),

  getStaff: () => request("/staff"),
  createStaff: (staff) => request("/staff", { method: "POST", body: JSON.stringify(staff) }),
  updateStaff: (id, patch) => request(`/staff/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteStaff: (id) => request(`/staff/${id}`, { method: "DELETE" }),

  getFirms: () => request("/firms"),
  createFirm: (firm) => request("/firms", { method: "POST", body: JSON.stringify(firm) }),
  updateFirm: (id, patch) => request(`/firms/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteFirm: (id) => request(`/firms/${id}`, { method: "DELETE" }),

  getPaymentMethods: () => request("/payment-methods"),
  createPaymentMethod: (name) => request("/payment-methods", { method: "POST", body: JSON.stringify({ name }) }),
  updatePaymentMethod: (id, patch) =>
    request(`/payment-methods/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  getIncome: () => request("/income"),
  createIncome: (entry) => request("/income", { method: "POST", body: JSON.stringify(entry) }),
  getExpense: () => request("/expense"),
  createExpense: (entry) => request("/expense", { method: "POST", body: JSON.stringify(entry) }),
  createIncomeType: (name) => request("/income-types", { method: "POST", body: JSON.stringify({ name }) }),
  createExpenseType: (name) => request("/expense-types", { method: "POST", body: JSON.stringify({ name }) }),

  getTasks: () => request("/tasks"),
  createTask: (task) => request("/tasks", { method: "POST", body: JSON.stringify(task) }),
  updateTask: (id, patch) => request(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),

  getStockCounts: () => request("/stock-counts"),
  createStockCount: (entry) => request("/stock-counts", { method: "POST", body: JSON.stringify(entry) }),

  getPurchaseInvoices: () => request("/purchase-invoices"),
  createPurchaseInvoice: (invoice) => request("/purchase-invoices", { method: "POST", body: JSON.stringify(invoice) }),

  getRefundRequests: () => request("/refund-requests"),
  createRefundRequest: (req) => request("/refund-requests", { method: "POST", body: JSON.stringify(req) }),
  updateRefundRequest: (id, status) =>
    request(`/refund-requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),

  getNotices: () => request("/notices"),
  markNoticeRead: (id) => request(`/notices/${id}/read`, { method: "PATCH" }),

  getIntegrations: () => request("/integrations"),
  updateIntegration: (id, status) =>
    request(`/integrations/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),

  getVariants: () => request("/variants"),
  createVariant: (variant) => request("/variants", { method: "POST", body: JSON.stringify(variant) }),
  deleteVariant: (id) => request(`/variants/${id}`, { method: "DELETE" }),

  getSubProducts: () => request("/sub-products"),
  createSubProduct: (item) => request("/sub-products", { method: "POST", body: JSON.stringify(item) }),
  deleteSubProduct: (id) => request(`/sub-products/${id}`, { method: "DELETE" }),

  getEInvoices: (direction) => request(`/e-invoices${direction ? `?direction=${direction}` : ""}`),
  createEInvoice: (invoice) => request("/e-invoices", { method: "POST", body: JSON.stringify(invoice) }),

  getCashRegisterBalance: () => request("/cash-register/balance"),
  getCashWithdrawals: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/cash-withdrawals${q ? `?${q}` : ""}`);
  },
  createCashWithdrawal: (payload) =>
    request("/cash-withdrawals", { method: "POST", body: JSON.stringify(payload) }),
  updateCashWithdrawal: (id, payload) =>
    request(`/cash-withdrawals/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
};
