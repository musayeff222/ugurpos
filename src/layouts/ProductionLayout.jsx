import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ImpersonationBanner from "../components/ImpersonationBanner";
import { isProductionAccount } from "../utils/authRedirect";
import "../styles/admin.css";
import "../styles/production.css";

const nav = [
  { to: "/istehsalat/xam-maddeler", label: "Xam maddələr", icon: "fa-cubes" },
  { to: "/istehsalat/istehsalat", label: "İstehsalat", icon: "fa-industry" },
];

export default function ProductionLayout() {
  const { isAuthenticated, isAdmin, isImpersonating, user, logout, returnToAdminPanel } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (isAdmin && !isImpersonating) {
    return <Navigate to="/admin" replace />;
  }

  if (!isProductionAccount(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogout = () => {
    if (isImpersonating) {
      const lastBranch = sessionStorage.getItem("ugurpos_admin_last_branch") || user?.branchId || "";
      const restored = returnToAdminPanel();
      if (restored && lastBranch) navigate(`/admin/branches/${lastBranch}`);
      else if (restored) navigate("/admin/branches");
      else navigate("/login/admin");
      return;
    }
    logout();
    navigate("/login");
  };

  return (
    <div className="admin-shell erp-shell production-shell">
      <aside className="admin-sidebar admin-sidebar--desktop erp-sidebar">
        <div className="erp-brand">
          <div className="erp-brand__mark">İS</div>
          <div>
            <strong>İstehsalat</strong>
            <span>{user?.branchName || "Şöbə"}</span>
          </div>
        </div>
        <nav className="admin-nav erp-nav">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : "")}>
              <i className={`fa ${item.icon}`} aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-footer erp-sidebar-footer">
          <div className="erp-user-chip">
            <span className="erp-avatar">{String(user?.branchName || "İS").slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{user?.branchName || "İstehsalat"}</strong>
              <small>{user?.email || user?.branchEmail || ""}</small>
            </div>
          </div>
          <button type="button" className="admin-back admin-logout-btn" onClick={handleLogout}>
            <i className="fa fa-sign-out" /> {isImpersonating ? "Admin panele dön" : "Çıxış"}
          </button>
        </div>
      </aside>
      <main className="admin-main erp-main">
        {isImpersonating && <ImpersonationBanner />}
        <nav className="production-mobile-nav">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
          <button type="button" onClick={handleLogout}>
            {isImpersonating ? "Admin" : "Çıxış"}
          </button>
        </nav>
        <div className="admin-page erp-page production-page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
