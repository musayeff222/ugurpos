import { api } from "../api/client";
import { getQueue, removeQueueItem, updateQueueItem } from "./queue";
import { isNetworkError } from "./network";

let running = false;

export async function flushSyncQueue() {
  if (running) return { flushed: 0, remaining: getQueue().length };
  running = true;
  let flushed = 0;

  try {
    const items = getQueue();
    for (const item of items) {
      try {
        if (item.type === "sale") {
          await api.createSale(item.payload);
        } else if (item.type === "cash-withdrawal") {
          await api.createCashWithdrawal(item.payload);
        } else if (item.type === "expense") {
          await api.createExpense(item.payload);
        } else {
          removeQueueItem(item.id);
          continue;
        }
        removeQueueItem(item.id);
        flushed += 1;
      } catch (err) {
        if (isNetworkError(err) || err.status === 401) {
          updateQueueItem(item.id, { lastError: err.message || "Şəbəkə xətası", tries: (item.tries || 0) + 1 });
          break;
        }
        updateQueueItem(item.id, { lastError: err.message || "Xəta", tries: (item.tries || 0) + 1 });
      }
    }
  } finally {
    running = false;
  }

  return { flushed, remaining: getQueue().length };
}

export function startSyncLoop(onChange) {
  const tick = async () => {
    if (!navigator.onLine) return;
    const result = await flushSyncQueue();
    onChange?.(result);
  };

  const onOnline = () => {
    tick();
  };

  window.addEventListener("online", onOnline);
  const timer = setInterval(tick, 20000);
  tick();

  return () => {
    window.removeEventListener("online", onOnline);
    clearInterval(timer);
  };
}
