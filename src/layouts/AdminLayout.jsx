import { useMemo, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAdminAlerts } from "../context/AdminAlertsContext";
import { useOffline } from "../offline/OfflineContext";
import SyncStatus from "../components/SyncStatus";
import "../styles/admin.css";

const adminNav = [
  {
    title: "Satış",
    items: [
      { to: "/admin", label: "Ana sayfa", icon: "fa-home", end: true },
      { to: "/admin/branches", label: "Hesaplar", icon: "fa-building" },
      { to: "/admin/products", label: "Ürünler", icon: "fa-cube" },
      { to: "/admin/activity", label: "Aktiviteler", icon: "fa-list-alt", badge: "activity" },
    ],
  },
  {
    title: "Finans",
    items: [
      { to: "/admin/cash-reports", label: "Raporlar", icon: "fa-bar-chart" },
      { to: "/admin/qr-menu", label: "Siparişler", icon: "fa-shopping-cart", badge: "orders" },
    ],
  },
  {
    title: "Kurulum",
    items: [{ to: "/admin/settings", label: "Kurulum", icon: "fa-cog" }],
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
  const [query, setQuery] = useState("");

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
    (item.to === "/admin/products" && location.pathname.startsWith("/admin/products")) ||
    (item.to === "/admin/qr-menu" && location.pathname.startsWith("/admin/qr-menu")) ||
    (item.to === "/admin/activity" && location.pathname.startsWith("/admin/activity")) ||
    (item.to === "/admin/cash-reports" && location.pathname.startsWith("/admin/cash-reports")) ||
    (item.to === "/admin/settings" && location.pathname.startsWith("/admin/settings"));

  const activeItem = flatNav.find((item) => isNavActive(item));
  const pageTitle =
    activeItem?.label || (location.pathname.includes("/branches/new") ? "Yeni hesap" : "Konsol");

  const breadcrumb = useMemo(() => {
    if (location.pathname === "/admin") return ["UgurPOS", "Ana sayfa"];
    if (location.pathname.startsWith("/admin/branches/new")) return ["UgurPOS", "Hesaplar", "Yeni kayıt"];
    if (location.pathname.startsWith("/admin/branches/")) return ["UgurPOS", "Hesaplar", "Kayıt"];
    if (location.pathname.startsWith("/admin/branches")) return ["UgurPOS", "Hesaplar"];
    return ["UgurPOS", pageTitle];
  }, [location.pathname, pageTitle]);

  const alertLink =
    latestAlert?.type === "qr_order"
      ? "/admin/qr-menu"
      : latestAlert?.type === "branch_login"
        ? "/admin/activity"
        : "/admin/activity";

  const submitSearch = (e) => {
    e.preventDefault();
    navigate(`/admin/branches?q=${encodeURIComponent(query.trim())}`);
  };

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
            <span>Console</span>
          </div>
        </div>
        <nav className="admin-nav erp-nav">{renderNav()}</nav>
        <div className="admin-sidebar-footer erp-sidebar-footer">
          <div className="erp-user-chip">
            <span className="erp-avatar">{initials(user?.email)}</span>
            <div>
              <strong>{user?.firmName || "Sistem yöneticisi"}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
          <Link to="/login" className="admin-sidebar-link" target="_blank" rel="noopener noreferrer">
            <i className="fa fa-external-link" /> POS
          </Link>
          <button type="button" className="admin-back admin-logout-btn" onClick={handleLogout}>
            <i className="fa fa-sign-out" /> Oturumu kapat
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
            <span>Console</span>
          </div>
          <div className="admin-mobile-header__actions">
            <Link to="/admin/branches/new" className="admin-icon-btn" title="Yeni hesap">
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
            <p className="erp-breadcrumb">{breadcrumb.join(" › ")}</p>
            <h1>{pageTitle}</h1>
          </div>
          <form className="crm-global-search" onSubmit={submitSearch}>
            <i className="fa fa-search" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hesap, e-posta veya şube no..."
            />
          </form>
          <div className="erp-topbar__right">
            <SyncStatus />
            <Link to="/admin/activity" className="erp-bell" aria-label="Bildirimler">
              <i className="fa fa-bell-o" />
              {pendingQrOrders > 0 && <span>{pendingQrOrders}</span>}
            </Link>
            <Link to="/login" className="admin-pos-link erp-pos-btn" target="_blank" rel="noopener noreferrer">
              POS
            </Link>
            <div className="erp-user-chip erp-user-chip--top">
              <span className="erp-avatar">{initials(user?.email)}</span>
              <div>
                <strong>Yönetici</strong>
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
              <em>Aç</em>
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
