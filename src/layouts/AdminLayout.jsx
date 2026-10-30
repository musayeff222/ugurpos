import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAdminAlerts } from "../context/AdminAlertsContext";
import { getPostLoginPath } from "../utils/authRedirect";
import { useOffline } from "../offline/OfflineContext";
import SyncStatus from "../components/SyncStatus";
import "../styles/admin.css";

const adminNav = [
  {
    title: "Satış",
    icon: "fa-line-chart",
    items: [
      { to: "/admin", label: "Ana sayfa", icon: "fa-home", end: true },
      { to: "/admin/branches", label: "Şubeler", icon: "fa-building" },
      { to: "/admin/franchise", label: "Franchise", icon: "fa-handshake-o" },
      { to: "/admin/istehsalat", label: "İstehsalat", icon: "fa-industry" },
      { to: "/admin/products", label: "Ürünler", icon: "fa-cube" },
      { to: "/admin/staff", label: "Çalışanlar", icon: "fa-users" },
      { to: "/admin/activity", label: "Aktiviteler", icon: "fa-list-alt", badge: "activity" },
    ],
  },
  {
    title: "Əlman",
    icon: "fa-user",
    items: [
      { to: "/admin/eleman/anbar", label: "Anbar", icon: "fa-cubes" },
      { to: "/admin/eleman/list", label: "Əlmanlar", icon: "fa-users" },
    ],
  },
  {
    title: "Mühasib",
    icon: "fa-calculator",
    items: [
      { to: "/admin/muhasib", label: "Bugün", icon: "fa-calendar", end: true },
      { to: "/admin/muhasib/alis", label: "Yeni alış", icon: "fa-shopping-basket" },
      { to: "/admin/muhasib/topdanci", label: "Toptancılar", icon: "fa-truck" },
      { to: "/admin/muhasib/kasa", label: "Kasalar", icon: "fa-money" },
      { to: "/admin/muhasib/borc", label: "Borçlar", icon: "fa-book" },
      { to: "/admin/muhasib/franchise", label: "Franchise borçları", icon: "fa-handshake-o" },
    ],
  },
  {
    title: "Finans",
    icon: "fa-bank",
    items: [
      { to: "/admin/cash-reports", label: "Raporlar", icon: "fa-bar-chart" },
      { to: "/admin/payment-methods", label: "Ödeme Yöntemleri", icon: "fa-credit-card" },
      { to: "/admin/qr-menu", label: "Siparişler", icon: "fa-shopping-cart", badge: "orders" },
    ],
  },
  {
    title: "Kurulum",
    icon: "fa-cog",
    items: [
      { to: "/admin/settings", label: "Kurulum", icon: "fa-cog" },
      { to: "/admin/web", label: "Web parametreleri", icon: "fa-globe" },
    ],
  },
];

const flatNav = adminNav.flatMap((group) => group.items);

const mobileTabs = [
  { to: "/admin", label: "Ana", icon: "fa-home", end: true },
  { to: "/admin/branches", label: "Şubeler", icon: "fa-building" },
  { to: "/admin/qr-menu", label: "Sipariş", icon: "fa-shopping-cart", badge: "orders" },
  { to: "/admin/cash-reports", label: "Rapor", icon: "fa-bar-chart" },
];

function getBreadcrumb(pathname, pageTitle) {
  if (pathname === "/admin") return ["UgurPOS", "Ana sayfa"];
  if (pathname.startsWith("/admin/istehsalat/new")) return ["UgurPOS", "İstehsalat", "Yeni kayıt"];
  if (pathname.startsWith("/admin/istehsalat/")) return ["UgurPOS", "İstehsalat", "Kayıt"];
  if (pathname.startsWith("/admin/istehsalat")) return ["UgurPOS", "İstehsalat"];
  if (pathname.startsWith("/admin/branches/new")) return ["UgurPOS", "Şubeler", "Yeni kayıt"];
  if (pathname.startsWith("/admin/branches/")) return ["UgurPOS", "Şubeler", "Kayıt"];
  if (pathname.startsWith("/admin/branches")) return ["UgurPOS", "Şubeler"];
  if (pathname.startsWith("/admin/franchise/ekle")) return ["UgurPOS", "Franchise", "Şube ekle"];
  if (pathname.startsWith("/admin/franchise/")) return ["UgurPOS", "Franchise", "Kayıt"];
  if (pathname.startsWith("/admin/franchise")) return ["UgurPOS", "Franchise"];
  if (pathname.startsWith("/admin/eleman/list")) return ["UgurPOS", "Əlman", "Əlmanlar"];
  if (pathname.startsWith("/admin/eleman/anbar") || pathname === "/admin/eleman") return ["UgurPOS", "Əlman", "Anbar"];
  if (/^\/admin\/eleman\/[^/]+\/stok/.test(pathname)) return ["UgurPOS", "Əlman", "Anbar"];
  if (pathname.startsWith("/admin/eleman/")) return ["UgurPOS", "Əlman", "Əməliyyatlar"];
  return ["UgurPOS", pageTitle];
}

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
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem("ugurpos_admin_sidebar") !== "closed";
    } catch {
      return true;
    }
  });
  const [openGroup, setOpenGroup] = useState(() => {
    const path = location.pathname;
    if (path.startsWith("/admin/eleman")) return "Əlman";
    if (path.startsWith("/admin/muhasib")) return "Mühasib";
    if (
      path.startsWith("/admin/cash-reports") ||
      path.startsWith("/admin/payment-methods") ||
      path.startsWith("/admin/qr-menu")
    ) {
      return "Finans";
    }
    if (path.startsWith("/admin/settings") || path.startsWith("/admin/web")) return "Kurulum";
    return "Satış";
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const muhasibSection = (pathname, search = "") => {
    const rest = pathname.slice("/admin/muhasib".length).replace(/^\//, "").split("/")[0];
    return rest || new URLSearchParams(search).get("bolum") || "bugun";
  };

  const isNavActive = (item) =>
    (item.to.startsWith("/admin/muhasib") &&
      location.pathname.startsWith("/admin/muhasib") &&
      muhasibSection(item.to.split("?")[0], item.to.split("?")[1] || "") ===
        muhasibSection(location.pathname, location.search)) ||
    (!item.to.startsWith("/admin/muhasib") && location.pathname === item.to) ||
    (item.to === "/admin/branches" && location.pathname.startsWith("/admin/branches")) ||
    (item.to === "/admin/franchise" && location.pathname.startsWith("/admin/franchise")) ||
    (item.to === "/admin/istehsalat" && location.pathname.startsWith("/admin/istehsalat")) ||
    (item.to === "/admin/products" && location.pathname.startsWith("/admin/products")) ||
    (item.to === "/admin/staff" && location.pathname.startsWith("/admin/staff")) ||
    (item.to === "/admin/qr-menu" && location.pathname.startsWith("/admin/qr-menu")) ||
    (item.to === "/admin/activity" && location.pathname.startsWith("/admin/activity")) ||
    (item.to === "/admin/cash-reports" && location.pathname.startsWith("/admin/cash-reports")) ||
    (item.to === "/admin/payment-methods" && location.pathname.startsWith("/admin/payment-methods")) ||
    (item.to === "/admin/settings" && location.pathname.startsWith("/admin/settings")) ||
    (item.to === "/admin/web" && location.pathname.startsWith("/admin/web")) ||
    (item.to === "/admin/eleman/anbar" &&
      (location.pathname === "/admin/eleman" || location.pathname.startsWith("/admin/eleman/anbar"))) ||
    (item.to === "/admin/eleman/list" &&
      location.pathname.startsWith("/admin/eleman") &&
      !location.pathname.startsWith("/admin/eleman/anbar") &&
      location.pathname !== "/admin/eleman");

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const current = adminNav.find((group) => group.items.some((item) => isNavActive(item)));
    if (current) setOpenGroup(current.title);
  }, [location.pathname, location.search]);

  const toggleSidebar = () => {
    setSidebarOpen((open) => {
      const next = !open;
      try {
        localStorage.setItem("ugurpos_admin_sidebar", next ? "open" : "closed");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  if (!isAuthenticated) {
    return <Navigate to="/login/admin" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return <Navigate to={user ? getPostLoginPath(user) : "/login/sube"} replace />;
  }

  if (!isOnline) {
    return <Navigate to="/sales" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/login/admin", { replace: true });
  };

  const activeItem = flatNav.find((item) => isNavActive(item));
  const pageTitle =
    activeItem?.label ||
    (location.pathname.includes("/istehsalat/new")
      ? "Yeni istehsalat"
      : location.pathname.includes("/franchise/ekle")
        ? "Şube ekle"
        : location.pathname.includes("/branches/new")
          ? "Yeni şube"
          : "Konsol");

  const breadcrumb = getBreadcrumb(location.pathname, pageTitle);

  const alertLink =
    latestAlert?.type === "qr_order"
      ? "/admin/qr-menu"
      : latestAlert?.type === "branch_login"
        ? "/admin/activity"
        : "/admin/activity";

  const searchTarget = location.pathname.startsWith("/admin/istehsalat")
    ? "/admin/istehsalat"
    : location.pathname.startsWith("/admin/franchise")
      ? "/admin/franchise"
      : "/admin/branches";
  const createHref = location.pathname.startsWith("/admin/istehsalat")
    ? "/admin/istehsalat/new"
    : location.pathname.startsWith("/admin/franchise")
      ? "/admin/franchise/ekle"
      : "/admin/branches/new";

  const submitSearch = (e) => {
    e.preventDefault();
    const next = query.trim();
    navigate(next ? `${searchTarget}?q=${encodeURIComponent(next)}` : searchTarget);
    setSearchOpen(false);
  };

  const renderNav = (onNavigate) =>
    adminNav.map((group) => {
      const open = openGroup === group.title;
      const current = group.items.some((item) => isNavActive(item));
      return (
        <div key={group.title} className="erp-nav-group">
          <button
            type="button"
            className={`erp-nav-parent${open ? " is-open" : ""}${current ? " is-current" : ""}`}
            aria-expanded={open}
            onClick={() => setOpenGroup(open ? "" : group.title)}
          >
            <i className={`fa ${group.icon}`} aria-hidden />
            <span>{group.title}</span>
            <i className={`fa ${open ? "fa-angle-up" : "fa-angle-down"}`} aria-hidden />
          </button>
          {open && (
            <div className="erp-nav-sub">
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
          )}
        </div>
      );
    });

  return (
    <div className={`admin-shell erp-shell ${menuOpen ? "erp-shell--menu" : ""} ${sidebarOpen ? "" : "erp-shell--collapsed"}`}>
      <aside className="admin-sidebar admin-sidebar--desktop erp-sidebar">
        <div className="erp-brand">
          <img className="erp-brand__mark" src="/icons/cigkofte-192.png" alt="İstanbul Çiğköfte" />
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
          <Link to="/login/sube" className="admin-sidebar-link" target="_blank" rel="noopener noreferrer">
            <i className="fa fa-external-link" /> POS
          </Link>
          <button type="button" className="admin-back admin-logout-btn" onClick={handleLogout}>
            <i className="fa fa-sign-out" /> Oturumu kapat
          </button>
        </div>
      </aside>

      {menuOpen && (
        <button
          type="button"
          className="admin-drawer-backdrop"
          aria-label="Menüyü kapat"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`admin-drawer ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <div className="erp-brand">
          <img className="erp-brand__mark" src="/icons/cigkofte-192.png" alt="İstanbul Çiğköfte" />
          <div>
            <strong>UgurPOS</strong>
            <span>Console</span>
          </div>
        </div>
        <nav className="admin-nav erp-nav">{renderNav(() => setMenuOpen(false))}</nav>
        <div className="admin-sidebar-footer erp-sidebar-footer">
          <div className="erp-user-chip">
            <span className="erp-avatar">{initials(user?.email)}</span>
            <div>
              <strong>{user?.firmName || "Sistem yöneticisi"}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
          <Link
            to="/login/sube"
            className="admin-sidebar-link"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
          >
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
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className="admin-mobile-header__title">
            <strong>{pageTitle}</strong>
            <span>UgurPOS Console</span>
          </div>
          <div className="admin-mobile-header__actions">
            <button
              type="button"
              className={`admin-icon-btn ${searchOpen ? "is-active" : ""}`}
              onClick={() => setSearchOpen((open) => !open)}
              title="Ara"
              aria-label="Ara"
            >
              <i className="fa fa-search" />
            </button>
            <Link to="/admin/activity" className="admin-icon-btn erp-bell" aria-label="Bildirimler">
              <i className="fa fa-bell-o" />
              {pendingQrOrders > 0 && <span>{pendingQrOrders}</span>}
            </Link>
            <Link to={createHref} className="admin-icon-btn" title="Yeni kayıt">
              <i className="fa fa-plus" />
            </Link>
          </div>
        </header>
        {searchOpen && (
          <form className="admin-mobile-search" onSubmit={submitSearch}>
            <i className="fa fa-search" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Şube, istehsalat, e-posta..."
              autoFocus
            />
            <button type="submit" className="btn btn-primary btn-sm">
              Ara
            </button>
          </form>
        )}

        <header className="admin-topbar admin-topbar--desktop erp-topbar">
          <div className="erp-topbar__left">
            <button
              type="button"
              className="erp-sidebar-toggle"
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? "Menüyü kapat" : "Menüyü aç"}
              aria-expanded={sidebarOpen}
            >
              <i className={`fa ${sidebarOpen ? "fa-angle-left" : "fa-bars"}`} aria-hidden />
            </button>
            <div>
            <p className="erp-breadcrumb">{breadcrumb.join(" › ")}</p>
            <h1>{pageTitle}</h1>
            </div>
          </div>
          <form className="crm-global-search" onSubmit={submitSearch}>
            <i className="fa fa-search" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Şube, istehsalat, e-posta..."
            />
          </form>
          <div className="erp-topbar__right">
            <SyncStatus />
            <Link to="/admin/activity" className="erp-bell" aria-label="Bildirimler">
              <i className="fa fa-bell-o" />
              {pendingQrOrders > 0 && <span>{pendingQrOrders}</span>}
            </Link>
            <Link to="/login/sube" className="admin-pos-link erp-pos-btn" target="_blank" rel="noopener noreferrer">
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
        {mobileTabs.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            end={item.end}
            className={`admin-bottom-nav__item ${isNavActive(item) ? "active" : ""}`}
          >
            <i className={`fa ${item.icon}`} aria-hidden />
            <span>{item.label}</span>
            {item.badge === "orders" && pendingQrOrders > 0 && (
              <span className="admin-nav-badge admin-nav-badge--bottom">{pendingQrOrders}</span>
            )}
          </Link>
        ))}
        <button
          type="button"
          className={`admin-bottom-nav__item ${menuOpen ? "active" : ""}`}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <i className="fa fa-bars" aria-hidden />
          <span>Menü</span>
        </button>
      </nav>
    </div>
  );
}
