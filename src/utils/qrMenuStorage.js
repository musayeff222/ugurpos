const CART_PREFIX = "qr_cart_";
const ORDERS_KEY = "qr_my_orders";

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
    total: order.total,
    status: order.status,
    createdAt: order.createdAt || new Date().toISOString(),
  });
  localStorage.setItem(ORDERS_KEY, JSON.stringify(list.slice(0, 30)));
}

export function updateStoredOrderStatus(orderId, status) {
  const list = loadMyOrders().map((item) =>
    item.id === orderId ? { ...item, status } : item
  );
  localStorage.setItem(ORDERS_KEY, JSON.stringify(list));
}
