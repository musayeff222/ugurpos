const STORAGE_KEY = "ugurpos_sync_queue_v1";
const listeners = new Set();

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  listeners.forEach((fn) => {
    try {
      fn(list);
    } catch {
      /* ignore */
    }
  });
}

export function subscribeQueue(fn) {
  listeners.add(fn);
  fn(read());
  return () => listeners.delete(fn);
}

export function getQueue() {
  return read();
}

export function getQueueCount() {
  return read().length;
}

export function enqueueItem(item) {
  const list = read();
  if (list.some((row) => row.id === item.id)) return list;
  const next = [...list, { ...item, tries: 0, lastError: "", queuedAt: item.queuedAt || new Date().toISOString() }];
  write(next);
  return next;
}

export function removeQueueItem(id) {
  write(read().filter((row) => row.id !== id));
}

export function updateQueueItem(id, patch) {
  write(read().map((row) => (row.id === id ? { ...row, ...patch } : row)));
}

export function mergeQueueIntoState(state) {
  const queue = read();
  if (!queue.length) return state;

  const sales = [...(state.sales || [])];
  const cashWithdrawals = [...(state.cashWithdrawals || [])];
  const expense = [...(state.expense || [])];
  const products = (state.products || []).map((p) => ({ ...p }));

  queue.forEach((item) => {
    if (item.type === "sale") {
      const sale = item.local;
      if (!sale) return;
      if (sales.some((s) => s.id === sale.id || s.clientSaleId === sale.clientSaleId)) return;
      sales.unshift(sale);
      (sale.items || []).forEach((line) => {
        if (!line.productId || sale.paymentType === "refund") return;
        const product = products.find((p) => p.id === line.productId);
        if (product) product.stock = Math.max(0, Number(product.stock || 0) - Number(line.qty || 0));
      });
    } else if (item.type === "cash-withdrawal") {
      const row = item.local;
      if (!row) return;
      if (cashWithdrawals.some((w) => w.id === row.id || w.clientId === row.clientId)) return;
      cashWithdrawals.unshift(row);
    } else if (item.type === "expense") {
      const row = item.local;
      if (!row) return;
      if (expense.some((e) => e.id === row.id || e.clientId === row.clientId)) return;
      expense.unshift(row);
    }
  });

  return { ...state, products, sales, cashWithdrawals, expense };
}
