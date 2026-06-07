import { createContext, useContext, useState } from "react";
import { api, setToken, getToken } from "../api/client";

const AuthContext = createContext(null);
const USER_KEY = "benimpos_user";

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
      persistUser(account, token);
      return account;
    } finally {
      setLoading(false);
    }
  };

  const loginBranch = async (loginCode, password) => {
    setLoading(true);
    try {
      const { token, user: account } = await api.branchLogin(loginCode, password);
      persistUser(account, token);
      return account;
    } finally {
      setLoading(false);
    }
  };

  const switchBranch = async (branchId) => {
    const { token, user: account } = await api.switchBranch(branchId);
    persistUser(account, token);
    return account;
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
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginBranch,
        logout,
        switchBranch,
        refreshBranches,
        loading,
        isAuthenticated: !!user && !!getToken(),
        isAdmin: user?.role === "admin",
        isBranchUser: user?.role === "branch" || user?.loginType === "branch",
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
