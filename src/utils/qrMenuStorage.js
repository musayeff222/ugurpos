const CART_PREFIX = "qr_cart_";
const ORDERS_KEY = "qr_my_orders";
const DEVICE_KEY = "ugurpos_device_id";
const LAST_BRANCH_KEY = "ugurpos_last_branch";

export function getOrCreateDeviceId() {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      const rand =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
          : Math.random().toString(36).slice(2, 14);
      id = `dev_${Date.now()}_${rand}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

export function saveLastBranchId(branchId) {
  if (!branchId || typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_BRANCH_KEY, branchId);
  } catch {
    /* ignore */
  }
}

export function getLastBranchId() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_BRANCH_KEY) || null;
  } catch {
    return null;
  }
}

export function loadBranchCart(branchId) {
  if (!branchId) return [];
  try {
    const raw = localStorage.getItem(`${CART_PREFIX}${branchId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBranchCart(branchId, cart) {
  if (!branchId) return;
  if (!cart?.length) {
    localStorage.removeItem(`${CART_PREFIX}${branchId}`);
    return;
  }
  localStorage.setItem(`${CART_PREFIX}${branchId}`, JSON.stringify(cart));
}

export function loadMyOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function rememberOrder(order) {
  if (!order?.id) return;
  const list = loadMyOrders().filter((item) => item.id !== order.id);
  list.unshift({
    id: order.id,
    code: order.code,
    branchId: order.branchId,
    branchName: order.branchName,
    branchNo: order.branchNo,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt || new Date().toISOString(),
  });
  localStorage.setItem(ORDERS_KEY, JSON.stringify(list.slice(0, 50)));
}

export function syncOrdersFromServer(orders) {
  if (!Array.isArray(orders) || orders.length === 0) return loadMyOrders();
  const byId = new Map(loadMyOrders().map((item) => [item.id, item]));
  orders.forEach((order) => {
    if (!order?.id) return;
    byId.set(order.id, {
      id: order.id,
      code: order.code,
      branchId: order.branchId,
      branchName: order.branchName,
      branchNo: order.branchNo,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt || byId.get(order.id)?.createdAt || new Date().toISOString(),
    });
  });
  const merged = [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  localStorage.setItem(ORDERS_KEY, JSON.stringify(merged.slice(0, 50)));
  return merged;
}

export function updateStoredOrderStatus(orderId, status) {
  const list = loadMyOrders().map((item) =>
    item.id === orderId ? { ...item, status } : item
  );
  localStorage.setItem(ORDERS_KEY, JSON.stringify(list));
}
