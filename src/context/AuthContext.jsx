import { createContext, useContext, useEffect, useState } from "react";
import { api, setToken, getToken, OFFLINE_SESSION_TOKEN } from "../api/client";
import { isNetworkError } from "../offline/network";
import {
  enqueueShiftClose,
  enqueueShiftOpen,
  isDesktopApp,
  saveStaffRoster,
  verifyOfflineStaff,
} from "../offline/staffRoster";
import { setDisplayCurrency } from "../utils/format";

const AuthContext = createContext(null);
const USER_KEY = "benimpos_user";
const ADMIN_BACKUP_KEY = "admin_session_backup";
const BRANCH_BACKUP_KEY = "branch_session_backup";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(USER_KEY);
    const account = saved ? JSON.parse(saved) : null;
    if (account?.currency) setDisplayCurrency(account.currency);
    return account;
  });
  const [loading, setLoading] = useState(false);

  const persistUser = (account, token) => {
    if (token) setToken(token);
    if (account?.currency) setDisplayCurrency(account.currency);
    localStorage.setItem(USER_KEY, JSON.stringify(account));
    setUser(account);
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { token, user: account } = await api.login(email, password);
      sessionStorage.removeItem(ADMIN_BACKUP_KEY);
      persistUser(account, token);
      return account;
    } finally {
      setLoading(false);
    }
  };

  const loginBranch = async (email, password) => {
    setLoading(true);
    try {
      const { token, user: account } = await api.branchLogin(email, password);
      sessionStorage.removeItem(ADMIN_BACKUP_KEY);
      persistUser(account, token);
      return account;
    } finally {
      setLoading(false);
    }
  };

  const loginStaff = async (login, password, options = {}) => {
    setLoading(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem(USER_KEY) || "null");
      if (options.fromBranch && currentUser?.loginType === "branch") {
        sessionStorage.setItem(
          BRANCH_BACKUP_KEY,
          JSON.stringify({ token: getToken(), user: currentUser })
        );
      } else {
        sessionStorage.removeItem(BRANCH_BACKUP_KEY);
      }

      try {
        const { token, user: account } = await api.staffLogin({ login, password });
        sessionStorage.removeItem(ADMIN_BACKUP_KEY);
        const accountWithShift = {
          ...account,
          shiftStartedAt: account.shiftStartedAt || new Date().toISOString(),
          offlineSession: false,
        };
        persistUser(accountWithShift, token);
        if (isDesktopApp()) {
          try {
            saveStaffRoster(await api.getOfflineStaff());
          } catch {
            /* siyahı yenilənməsə cari giriş qalsın */
          }
        }
        return accountWithShift;
      } catch (err) {
        if (!isDesktopApp() || !isNetworkError(err)) throw err;
        const account = verifyOfflineStaff(login, password);
        if (!account) throw new Error("Invalid credentials");
        sessionStorage.removeItem(ADMIN_BACKUP_KEY);
        const accountWithShift = {
          ...account,
          shiftStartedAt: new Date().toISOString(),
          offlineSession: true,
        };
        persistUser(accountWithShift, OFFLINE_SESSION_TOKEN);
        enqueueShiftOpen(account.staffId, accountWithShift.shiftStartedAt);
        return accountWithShift;
      }
    } finally {
      setLoading(false);
    }
  };

  const returnToBranchSession = () => {
    const raw = sessionStorage.getItem(BRANCH_BACKUP_KEY);
    if (raw) {
      const backup = JSON.parse(raw);
      sessionStorage.removeItem(BRANCH_BACKUP_KEY);
      persistUser(backup.user, backup.token);
      return true;
    }
    return false;
  };

  const enterBranchAsAdmin = async (branchId) => {
    const backup = {
      token: getToken(),
      user: JSON.parse(localStorage.getItem(USER_KEY) || "null"),
    };
    sessionStorage.setItem(ADMIN_BACKUP_KEY, JSON.stringify(backup));

    const { token, user: account } = await api.enterBranchAsAdmin(branchId);
    persistUser(account, token);
    return account;
  };

  const enterStaffAsAdmin = async (staffId) => {
    const currentUser = JSON.parse(localStorage.getItem(USER_KEY) || "null");
    if (!currentUser?.impersonating) {
      sessionStorage.setItem(
        ADMIN_BACKUP_KEY,
        JSON.stringify({ token: getToken(), user: currentUser })
      );
    }

    const { token, user: account } = await api.impersonateAdminStaff(staffId);
    const accountWithShift = { ...account, shiftStartedAt: new Date().toISOString() };
    persistUser(accountWithShift, token);
    return accountWithShift;
  };

  const returnToAdminPanel = () => {
    const raw = sessionStorage.getItem(ADMIN_BACKUP_KEY);
    if (raw) {
      const backup = JSON.parse(raw);
      sessionStorage.removeItem(ADMIN_BACKUP_KEY);
      persistUser(backup.user, backup.token);
      return true;
    }
    return false;
  };

  const refreshBranches = async () => {
    const branches = await api.getBranches();
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, branches };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
    return branches;
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(ADMIN_BACKUP_KEY);
    sessionStorage.removeItem(BRANCH_BACKUP_KEY);
    setUser(null);
  };

  const endStaffShift = async () => {
    const current = JSON.parse(localStorage.getItem(USER_KEY) || "null");
    const alreadyClosed = (() => {
      try {
        return sessionStorage.getItem("ugurpos_shift_locked") === "1";
      } catch {
        return false;
      }
    })();
    if (current?.loginType === "staff" && !current?.impersonating && !alreadyClosed) {
      const endedAt = new Date().toISOString();
      try {
        if (current.offlineSession) await api.closeStaffShift({ staffId: current.staffId, endedAt });
        else await api.endStaffShift();
      } catch (err) {
        if (isNetworkError(err) || current.offlineSession) enqueueShiftClose(current.staffId, endedAt);
      }
    }
    try {
      sessionStorage.removeItem("ugurpos_shift_locked");
    } catch {
      /* ignore */
    }
    if (returnToBranchSession()) return "branch";
    if (current?.impersonating && returnToAdminPanel()) return "admin";
    logout();
    return "logout";
  };

  useEffect(() => {
    if (!isDesktopApp() || !user?.branchId) return undefined;
    const token = getToken();
    if (!token || token === OFFLINE_SESSION_TOKEN) return undefined;
    let cancelled = false;
    api
      .getOfflineStaff()
      .then((pack) => {
        if (!cancelled) saveStaffRoster(pack);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.branchId, user?.staffId]);

  useEffect(() => {
    if (!user?.firmId || !getToken() || getToken() === OFFLINE_SESSION_TOKEN) return undefined;
    const request = user.role === "admin" ? api.getAdminCurrency() : api.getDisplayCurrency();
    let cancelled = false;
    request
      .then((data) => {
        if (cancelled || !data?.currency) return;
        setDisplayCurrency(data.currency);
        setUser((prev) => {
          if (!prev || prev.currency === data.currency) return prev;
          const next = { ...prev, currency: data.currency };
          localStorage.setItem(USER_KEY, JSON.stringify(next));
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.firmId, user?.role]);

  const patchUser = (patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginBranch,
        loginStaff,
        returnToBranchSession,
        endStaffShift,
        enterBranchAsAdmin,
        enterStaffAsAdmin,
        returnToAdminPanel,
        logout,
        patchUser,
        refreshBranches,
        loading,
        isAuthenticated: !!user && !!getToken(),
        isAdmin: user?.role === "admin",
        isBranchUser: user?.role === "branch" || user?.loginType === "branch" || user?.role === "staff" || user?.loginType === "staff",
        isStaffUser: user?.role === "staff" || user?.loginType === "staff",
        isImpersonating: !!user?.impersonating,
        isProductionBranch: user?.branchKind === "production",
        activeBranchId: user?.branchId,
        activeBranchName: user?.branchName,
        activeStaffId: user?.staffId,
        activeStaffName: user?.staffName,
        activeStaffRole: user?.staffRole,
        canCashExpense: user?.canCashExpense || user?.role !== "staff",
        branches: user?.branches || [],
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
