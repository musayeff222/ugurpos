import { useMemo, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAdminAlerts } from "../context/AdminAlertsContext";
import { useOffline } from "../offline/OfflineContext";
import SyncStatus from "../components/SyncStatus";
import "../styles/admin.css";

const adminNav = [
  {
    title: "Komuta",
    items: [
      { to: "/admin", label: "Komuta merkezi", icon: "fa-th-large", end: true },
      { to: "/admin/branches", label: "Şubeler", icon: "fa-sitemap" },
      { to: "/admin/activity", label: "Hareketler", icon: "fa-bolt", badge: "activity" },
    ],
  },
  {
    title: "Finans & Satış",
    items: [
      { to: "/admin/cash-reports", label: "Kasa & raporlar", icon: "fa-line-chart" },
      { to: "/admin/qr-menu", label: "Web sipariş", icon: "fa-shopping-bag", badge: "orders" },
    ],
  },
  {
    title: "Sistem",
    items: [{ to: "/admin/settings", label: "Firma ayarları", icon: "fa-sliders" }],
  },
];

const flatNav = adminNav.flatMap((group) => group.items);

function initials(text) {
  const value = String(text || "SA")
    .replace(/@.*/, "")
    .trim();
  const parts = value.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return value.slice(0, 2).toUpperCase() || "SA";
}

export default function AdminLayout() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { pendingQrOrders, latestAlert, clearLatest } = useAdminAlerts();
  const { isOnline } = useOffline();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login/admin" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  if (!isOnline) {
    return <Navigate to="/sales" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/login/admin", { replace: true });
  };

  const isNavActive = (item) =>
    location.pathname === item.to ||
    (item.to === "/admin/branches" && location.pathname.startsWith("/admin/branches")) ||
    (item.to === "/admin/qr-menu" && location.pathname.startsWith("/admin/qr-menu")) ||
    (item.to === "/admin/activity" && location.pathname.startsWith("/admin/activity")) ||
    (item.to === "/admin/cash-reports" && location.pathname.startsWith("/admin/cash-reports")) ||
    (item.to === "/admin/settings" && location.pathname.startsWith("/admin/settings"));

  const activeItem = flatNav.find((item) => isNavActive(item));
  const pageTitle =
    activeItem?.label || (location.pathname.includes("/branches/new") ? "Yeni şube" : "Super Admin");

  const breadcrumb = useMemo(() => {
    if (location.pathname === "/admin") return ["Super Admin", "Komuta merkezi"];
    if (location.pathname.startsWith("/admin/branches/new")) return ["Super Admin", "Şubeler", "Yeni şube"];
    if (location.pathname.startsWith("/admin/branches/")) return ["Super Admin", "Şubeler", "Şube detayı"];
    if (location.pathname.startsWith("/admin/branches")) return ["Super Admin", "Şubeler"];
    return ["Super Admin", pageTitle];
  }, [location.pathname, pageTitle]);

  const alertLink =
    latestAlert?.type === "qr_order"
      ? "/admin/qr-menu"
      : latestAlert?.type === "branch_login"
        ? "/admin/activity"
        : "/admin/activity";

  const renderNav = (onNavigate) =>
    adminNav.map((group) => (
      <div key={group.title} className="erp-nav-group">
        <p className="erp-nav-title">{group.title}</p>
        {group.items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            end={item.end}
            className={isNavActive(item) ? "active" : ""}
            onClick={onNavigate}
          >
            <i className={`fa ${item.icon}`} aria-hidden />
            <span>{item.label}</span>
            {item.badge === "orders" && pendingQrOrders > 0 && (
              <em className="admin-nav-badge">{pendingQrOrders}</em>
            )}
          </Link>
        ))}
      </div>
    ));

  return (
    <div className={`admin-shell erp-shell ${menuOpen ? "erp-shell--menu" : ""}`}>
      <aside className="admin-sidebar admin-sidebar--desktop erp-sidebar">
        <div className="erp-brand">
          <div className="erp-brand__mark">UP</div>
          <div>
            <strong>UgurPOS</strong>
            <span>Super Admin ERP</span>
          </div>
        </div>
        <nav className="admin-nav erp-nav">{renderNav()}</nav>
        <div className="admin-sidebar-footer erp-sidebar-footer">
          <div className="erp-user-chip">
            <span className="erp-avatar">{initials(user?.email)}</span>
            <div>
              <strong>{user?.firmName || "Yönetim"}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
          <Link to="/login" className="admin-sidebar-link" target="_blank" rel="noopener noreferrer">
            <i className="fa fa-external-link" /> POS girişi
          </Link>
          <button type="button" className="admin-back admin-logout-btn" onClick={handleLogout}>
            <i className="fa fa-power-off" /> Çıkış
          </button>
        </div>
      </aside>

      <main className="admin-main erp-main">
        <header className="admin-mobile-header">
          <button
            type="button"
            className={`menu-hamburger ${menuOpen ? "is-open" : ""}`}
            aria-label="Menü"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className="admin-mobile-header__title">
            <strong>{pageTitle}</strong>
            <span>Super Admin</span>
          </div>
          <div className="admin-mobile-header__actions">
            <Link to="/admin/branches/new" className="admin-icon-btn" title="Yeni şube">
              <i className="fa fa-plus" />
            </Link>
            <button type="button" className="admin-icon-btn" onClick={handleLogout} title="Çıkış">
              <i className="fa fa-sign-out" />
            </button>
          </div>
        </header>

        {menuOpen && (
          <div className="erp-drawer">
            <nav className="admin-nav erp-nav">{renderNav(() => setMenuOpen(false))}</nav>
          </div>
        )}

        <header className="admin-topbar admin-topbar--desktop erp-topbar">
          <div className="erp-topbar__left">
            <p className="erp-breadcrumb">{breadcrumb.join(" / ")}</p>
            <h1>{pageTitle}</h1>
          </div>
          <div className="erp-topbar__right">
            <SyncStatus />
            <Link to="/admin/activity" className="erp-bell" aria-label="Bildirimler">
              <i className="fa fa-bell-o" />
              {pendingQrOrders > 0 && <span>{pendingQrOrders}</span>}
            </Link>
            <Link to="/login" className="admin-pos-link erp-pos-btn" target="_blank" rel="noopener noreferrer">
              <i className="fa fa-desktop" /> POS
            </Link>
            <div className="erp-user-chip erp-user-chip--top">
              <span className="erp-avatar">{initials(user?.email)}</span>
              <div>
                <strong>Super Admin</strong>
                <small>{user?.email}</small>
              </div>
            </div>
          </div>
        </header>

        <div className="admin-content erp-content">
          {latestAlert && !location.pathname.startsWith(alertLink) && (
            <Link to={alertLink} className="admin-alert-toast" onClick={clearLatest}>
              <strong>{latestAlert.title}</strong>
              {latestAlert.detail ? <span>{latestAlert.detail}</span> : null}
              <em>Görüntüle →</em>
            </Link>
          )}
          <Outlet />
        </div>
      </main>

      <nav className="admin-bottom-nav" aria-label="Admin menü">
        {flatNav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            end={item.end}
            className={`admin-bottom-nav__item ${isNavActive(item) ? "active" : ""}`}
          >
            <i className={`fa ${item.icon}`} aria-hidden />
            <span>{item.label.split(" ")[0]}</span>
            {item.badge === "orders" && pendingQrOrders > 0 && (
              <span className="admin-nav-badge admin-nav-badge--bottom">{pendingQrOrders}</span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
