import { useState } from "react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ImpersonationBanner from "../components/ImpersonationBanner";
import { isProductionAccount } from "../utils/authRedirect";
import "../styles/admin.css";
import "../styles/production.css";

const nav = [
  { to: "/istehsalat/xammaddeler", label: "Xammaddələr", icon: "fa-cubes" },
  { to: "/istehsalat/istifade", label: "İstifadə", icon: "fa-industry" },
  { to: "/istehsalat/mehsullar", label: "Hazırlanan məhsullar", icon: "fa-archive" },
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

  // localStorage is written before React state flushes after admin "Geç"
  let sessionUser = user;
  try {
    const saved = JSON.parse(localStorage.getItem("benimpos_user") || "null");
    if (saved?.impersonating || saved?.branchKind === "production") sessionUser = saved;
  } catch {
    /* ignore */
  }

  if (!isAuthenticated && !sessionUser) {
    return <Navigate to="/login/istesalat" replace state={{ from: location }} />;
  }

  const adminOnly = (sessionUser?.role === "admin" || isAdmin) && !(sessionUser?.impersonating || isImpersonating);
  if (adminOnly) {
    return <Navigate to="/admin" replace />;
  }

  if (!isProductionAccount(sessionUser || user)) {
    return <Navigate to="/dashboard" replace />;
  }

  const activeUser = sessionUser || user;
  const viewingAsAdmin = !!(activeUser?.impersonating || isImpersonating);
  const displayName = activeUser?.staffName || activeUser?.email || activeUser?.branchEmail || "İstifadəçi";
  const roleLabel = viewingAsAdmin ? "Admin baxışı" : "İstehsalat";

  const handleLogout = () => {
    if (viewingAsAdmin) {
      const lastBranch = sessionStorage.getItem("ugurpos_admin_last_branch") || activeUser?.branchId || "";
      const restored = returnToAdminPanel();
      if (restored && lastBranch) navigate(`/admin/istehsalat/${lastBranch}`);
      else if (restored) navigate("/admin/istehsalat");
      else navigate("/login/admin");
      return;
    }
    logout();
    navigate("/login/istesalat");
  };

  const showText = !collapsed || mobileOpen;

  const renderNav = (onNavigate) =>
    nav.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
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
              <small>{activeUser?.branchName || "İstehsalat şöbəsi"}</small>
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
            {showText && <span>{viewingAsAdmin ? "Admin panele dön" : "Çıxış"}</span>}
          </button>
        </div>
      </aside>
      <main className="prod-main">
        {viewingAsAdmin && <ImpersonationBanner />}
        <header className="prod-mobile-bar">
          <button type="button" className="prod-hamburger" onClick={() => setMobileOpen((open) => !open)} aria-label="Menyu">
            <span />
            <span />
            <span />
          </button>
          <strong>{activeUser?.branchName || "Ləvazimatlar"}</strong>
          <button type="button" onClick={handleLogout}>
            {viewingAsAdmin ? "Admin" : "Çıxış"}
          </button>
        </header>
        <div className="prod-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
