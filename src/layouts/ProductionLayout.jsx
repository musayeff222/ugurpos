import { useState } from "react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ImpersonationBanner from "../components/ImpersonationBanner";
import { isProductionAccount } from "../utils/authRedirect";
import "../styles/admin.css";
import "../styles/production.css";

const nav = [
  { to: "/istehsalat", label: "Ana səhifə", icon: "fa-home", end: true },
  { to: "/istehsalat/xammaddeler", label: "Xammaddələr", icon: "fa-cubes" },
  { to: "/istehsalat/istifade", label: "İstifadə", icon: "fa-exchange" },
  { to: "/istehsalat/mehsullar", label: "Hazırlanan məhsullar", icon: "fa-cutlery" },
];

function initials(text) {
  const value = String(text || "İS").trim();
  const parts = value.split(/[\s._@-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return value.slice(0, 2).toUpperCase();
}

export default function ProductionLayout() {
  const { isAuthenticated, isAdmin, isImpersonating, user, logout, returnToAdminPanel } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (isAdmin && !isImpersonating) {
    return <Navigate to="/admin" replace />;
  }

  if (!isProductionAccount(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  const displayName = user?.staffName || user?.email || user?.branchEmail || "İstifadəçi";
  const roleLabel = isImpersonating ? "Admin baxışı" : "İstehsalat";

  const handleLogout = () => {
    if (isImpersonating) {
      const lastBranch = sessionStorage.getItem("ugurpos_admin_last_branch") || user?.branchId || "";
      const restored = returnToAdminPanel();
      if (restored && lastBranch) navigate(`/admin/istehsalat/${lastBranch}`);
      else if (restored) navigate("/admin/istehsalat");
      else navigate("/login/admin");
      return;
    }
    logout();
    navigate("/login");
  };

  const showText = !collapsed || mobileOpen;

  const renderNav = (onNavigate) =>
    nav.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) => (isActive ? "active" : "")}
        onClick={onNavigate}
      >
        <i className={`fa ${item.icon}`} aria-hidden />
        {showText && <span>{item.label}</span>}
      </NavLink>
    ));

  return (
    <div className={`production-shell ${collapsed ? "production-shell--collapsed" : ""} ${mobileOpen ? "production-shell--mobile" : ""}`}>
      {mobileOpen && <button type="button" className="prod-backdrop" aria-label="Bağla" onClick={() => setMobileOpen(false)} />}
      <aside className="prod-sidebar">
        <div className="prod-user">
          <span className="prod-user__avatar">{initials(displayName)}</span>
          {showText && (
            <div>
              <strong>{displayName}</strong>
              <small>{user?.branchName || "İstehsalat şöbəsi"}</small>
              <small>{roleLabel}</small>
            </div>
          )}
        </div>
        <button
          type="button"
          className="prod-collapse"
          onClick={() => setCollapsed((open) => !open)}
          aria-label={collapsed ? "Menyunu aç" : "Menyunu bağla"}
        >
          <i className={`fa ${collapsed ? "fa-angle-right" : "fa-angle-left"}`} />
          {!collapsed || mobileOpen ? <span>Menyu</span> : null}
        </button>
        <nav className="prod-nav">{renderNav(() => setMobileOpen(false))}</nav>
        <div className="prod-sidebar__foot">
          <button type="button" className="prod-logout" onClick={handleLogout}>
            <i className="fa fa-sign-out" />
            {showText && <span>{isImpersonating ? "Admin panele dön" : "Çıxış"}</span>}
          </button>
        </div>
      </aside>
      <main className="prod-main">
        {isImpersonating && <ImpersonationBanner />}
        <header className="prod-mobile-bar">
          <button type="button" className="prod-hamburger" onClick={() => setMobileOpen((open) => !open)} aria-label="Menyu">
            <span />
            <span />
            <span />
          </button>
          <strong>{user?.branchName || "Ləvazimatlar"}</strong>
          <button type="button" onClick={handleLogout}>
            {isImpersonating ? "Admin" : "Çıxış"}
          </button>
        </header>
        <div className="prod-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
