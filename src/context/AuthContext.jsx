import { createContext, useContext, useState } from "react";
import { api, setToken, getToken } from "../api/client";

const AuthContext = createContext(null);
const USER_KEY = "benimpos_user";
const ADMIN_BACKUP_KEY = "admin_session_backup";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const persistUser = (account, token) => {
    if (token) setToken(token);
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
    setUser(null);
  };

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
        enterBranchAsAdmin,
        returnToAdminPanel,
        logout,
        patchUser,
        refreshBranches,
        loading,
        isAuthenticated: !!user && !!getToken(),
        isAdmin: user?.role === "admin",
        isBranchUser: user?.role === "branch" || user?.loginType === "branch",
        isImpersonating: !!user?.impersonating,
        activeBranchId: user?.branchId,
        activeBranchName: user?.branchName,
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
