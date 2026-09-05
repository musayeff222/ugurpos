import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useOffline } from "../offline/OfflineContext";
import { api } from "../api/client";
import { createDefaultState } from "./defaults";
import { loadStateCache, saveStateCache } from "../offline/cache";
import { enqueueItem, mergeQueueIntoState } from "../offline/queue";
import { isNetworkError } from "../offline/network";
import { newClientId } from "../offline/ids";
import { buildLocalCashWithdrawal, buildLocalExpense, buildLocalSale } from "../offline/localRecords";

const StoreContext = createContext(null);

function applyState(branchId, data) {
  const merged = mergeQueueIntoState(data);
  saveStateCache(branchId, merged);
  return merged;
}

export function StoreProvider({ children }) {
  const { isAuthenticated, activeBranchId, activeStaffName } = useAuth();
  const { lastSyncAt } = useOffline();
  const [state, setState] = useState(createDefaultState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = async () => {
    try {
      const data = await api.getState();
      const merged = applyState(activeBranchId, data);
      setState(merged);
      setError(null);
      return merged;
    } catch (err) {
      const cached = loadStateCache(activeBranchId);
      if (cached) {
        const merged = mergeQueueIntoState(cached);
        setState(merged);
        if (!isNetworkError(err)) setError(err.message);
        return merged;
      }
      throw err;
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setState(createDefaultState());
      setError(null);
      return;
    }
    setLoading(true);
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isAuthenticated, activeBranchId]);

  useEffect(() => {
    if (!isAuthenticated || !lastSyncAt) return;
    refresh().catch(() => {});
  }, [lastSyncAt]);

  const apiActions = useMemo(
    () => ({
      state,
      loading,
      error,
      refresh,

      resetDemoData: refresh,

      addProduct: async (product) => {
        const created = await api.createProduct(product);
        await refresh();
        return created;
      },

      updateProduct: async (id, patch) => {
        const updated = await api.updateProduct(id, patch);
        await refresh();
        return updated;
      },

      uploadProductImage: async (id, file) => {
        const product = await api.uploadProductImage(id, file);
        await refresh();
        return product;
      },

      deleteProducts: async (ids) => {
        await api.deleteProducts(ids);
        return refresh();
      },

      addCustomer: async (customer) => {
        await api.createCustomer(customer);
        return refresh();
      },

      updateCustomer: async (id, patch) => {
        await api.updateCustomer(id, patch);
        return refresh();
      },

      deleteCustomer: async (id) => {
        await api.deleteCustomer(id);
        return refresh();
      },

      addCustomerPayment: async (customerId, amount) => {
        await api.addCustomerPayment(customerId, amount);
        return refresh();
      },

      completeSale: async (payload) => {
        const clientSaleId = payload.clientSaleId || newClientId("sale");
        const createdAt = payload.createdAt || new Date().toISOString();
        const body = { ...payload, clientSaleId, createdAt };
        try {
          const sale = await api.createSale(body);
          await refresh();
          return sale;
        } catch (err) {
          if (!isNetworkError(err)) throw err;
          const local = buildLocalSale(body, clientSaleId);
          enqueueItem({ id: clientSaleId, type: "sale", payload: body, local });
          const next = applyState(activeBranchId, { ...state });
          setState(next);
          return local;
        }
      },

      updateSalePayment: async (id, paymentType) => {
        const sale = await api.updateSale(id, { paymentType });
        await refresh();
        return sale;
      },

      deleteSale: async (id) => {
        await api.deleteSale(id);
        await refresh();
      },

      addGroup: async (name) => {
        const created = await api.createGroup(name);
        await refresh();
        return created;
      },

      deleteGroup: async (id) => {
        await api.deleteGroup(id);
        return refresh();
      },

      addFirm: async (firm) => {
        await api.createFirm(firm);
        return refresh();
      },

      updateFirm: async (id, patch) => {
        await api.updateFirm(id, patch);
        return refresh();
      },

      deleteFirm: async (id) => {
        await api.deleteFirm(id);
        return refresh();
      },

      addStaff: async (staff) => {
        await api.createStaff(staff);
        return refresh();
      },

      updateStaff: async (id, patch) => {
        await api.updateStaff(id, patch);
        return refresh();
      },

      deleteStaff: async (id) => {
        await api.deleteStaff(id);
        return refresh();
      },

      addPaymentMethod: async (name) => {
        await api.createPaymentMethod(name);
        return refresh();
      },

      updatePaymentMethod: async (id, patch) => {
        await api.updatePaymentMethod(id, patch);
        return refresh();
      },

      addIncome: async (entry) => {
        await api.createIncome(entry);
        return refresh();
      },

      addExpense: async (entry) => {
        const clientId = entry.clientId || newClientId("exp");
        const body = { ...entry, clientId };
        try {
          const created = await api.createExpense(body);
          await refresh();
          return created;
        } catch (err) {
          if (!isNetworkError(err)) throw err;
          const local = buildLocalExpense(body, clientId);
          enqueueItem({ id: clientId, type: "expense", payload: body, local });
          const next = applyState(activeBranchId, { ...state });
          setState(next);
          return local;
        }
      },

      addCashWithdrawal: async (payload) => {
        const clientId = payload.clientId || newClientId("cw");
        const createdAt = payload.createdAt || new Date().toISOString();
        const body = { ...payload, clientId, createdAt };
        try {
          const created = await api.createCashWithdrawal(body);
          await refresh();
          return created;
        } catch (err) {
          if (!isNetworkError(err)) throw err;
          const local = buildLocalCashWithdrawal(body, clientId, activeStaffName);
          enqueueItem({ id: clientId, type: "cash-withdrawal", payload: body, local });
          const next = applyState(activeBranchId, { ...state });
          setState(next);
          return local;
        }
      },

      updateCashWithdrawal: async (id, payload) => {
        const updated = await api.updateCashWithdrawal(id, payload);
        await refresh();
        return updated;
      },

      addIncomeType: async (name) => {
        await api.createIncomeType(name);
        return refresh();
      },

      addExpenseType: async (name) => {
        await api.createExpenseType(name);
        return refresh();
      },

      addTask: async (task) => {
        await api.createTask(task);
        return refresh();
      },

      updateTask: async (id, patch) => {
        await api.updateTask(id, patch);
        return refresh();
      },

      deleteTask: async (id) => {
        await api.deleteTask(id);
        return refresh();
      },

      addStockCount: async (entry) => {
        await api.createStockCount(entry);
        return refresh();
      },

      addPurchaseInvoice: async (invoice) => {
        await api.createPurchaseInvoice(invoice);
        return refresh();
      },

      addRefundRequest: async (req) => {
        await api.createRefundRequest(req);
        return refresh();
      },

      processRefund: async ({ items, note }) => {
        await api.createRefund({ items, note });
        return refresh();
      },

      markNoticeRead: async (id) => {
        await api.markNoticeRead(id);
        return refresh();
      },

      addVariant: async (variant) => {
        await api.createVariant(variant);
        return refresh();
      },

      deleteVariant: async (id) => {
        await api.deleteVariant(id);
        return refresh();
      },

      addSubProduct: async (item) => {
        await api.createSubProduct(item);
        return refresh();
      },

      deleteSubProduct: async (id) => {
        await api.deleteSubProduct(id);
        return refresh();
      },

      addEInvoice: async (invoice) => {
        await api.createEInvoice(invoice);
        return refresh();
      },

      updateIntegration: async (id, status) => {
        await api.updateIntegration(id, status);
        return refresh();
      },

      updateRefundRequest: async (id, status) => {
        await api.updateRefundRequest(id, status);
        return refresh();
      },
    }),
    [state, loading, error, activeBranchId, activeStaffName]
  );

  return <StoreContext.Provider value={apiActions}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
