import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { createDefaultState } from "./defaults";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState(createDefaultState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = async () => {
    const data = await api.getState();
    setState(data);
    return data;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setState(createDefaultState());
      setError(null);
      return;
    }
    setLoading(true);
    api
      .getState()
      .then(setState)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const apiActions = useMemo(
    () => ({
      state,
      loading,
      error,
      refresh,

      resetDemoData: refresh,

      addProduct: async (product) => {
        await api.createProduct(product);
        return refresh();
      },

      updateProduct: async (id, patch) => {
        await api.updateProduct(id, patch);
        return refresh();
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
        const sale = await api.createSale(payload);
        await refresh();
        return sale;
      },

      addGroup: async (name) => {
        await api.createGroup(name);
        return refresh();
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
        await api.createExpense(entry);
        return refresh();
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
    [state, loading, error]
  );

  return <StoreContext.Provider value={apiActions}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
