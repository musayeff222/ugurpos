const TOKEN_KEY = "benimpos_token";
const USER_KEY = "benimpos_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });
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

  getStaffForLogin: (branchEmail) =>
    request(`/auth/staff-for-login?branchEmail=${encodeURIComponent(branchEmail)}`),

  getBranches: () => request("/auth/branches"),

  getAdminSummary: () => request("/admin/summary"),
  getAdminBranches: () => request("/admin/branches"),
  getAdminBranch: (id) => request(`/admin/branches/${id}`),
  getAdminBranchActivity: (id) => request(`/admin/branches/${id}/activity`),
  enterBranchAsAdmin: (id) => request(`/admin/branches/${id}/enter`, { method: "POST" }),
  createBranch: (branch) => request("/admin/branches", { method: "POST", body: JSON.stringify(branch) }),
  updateBranch: (id, patch) => request(`/admin/branches/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteBranch: (id) => request(`/admin/branches/${id}`, { method: "DELETE" }),

  getAdminActivity: () => request("/admin/activity"),
  getAdminActivityPoll: (after) =>
    request(`/admin/activity/poll${after ? `?after=${encodeURIComponent(after)}` : ""}`),
  getAdminCashWithdrawals: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/cash-withdrawals${q ? `?${q}` : ""}`);
  },
  getAdminBusinessDayReports: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/business-day-reports${q ? `?${q}` : ""}`);
  },
  changeAdminPassword: (payload) =>
    request("/admin/account/password", { method: "PATCH", body: JSON.stringify(payload) }),
  updateAdminAccount: (payload) =>
    request("/admin/account", { method: "PATCH", body: JSON.stringify(payload) }),

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
};
