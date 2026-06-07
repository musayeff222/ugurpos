import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/admin.css";

const adminNav = [
  { to: "/admin", label: "Özet", end: true },
  { to: "/admin/branches", label: "Şubeler" },
  { to: "/admin/qr-menu", label: "QR Menü" },
];

export default function AdminLayout() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle("admin-nav-open", navOpen);
    return () => document.body.classList.remove("admin-nav-open");
  }, [navOpen]);

  if (!isAuthenticated) {
    return <Navigate to="/login/admin" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/login/admin", { replace: true });
  };

  const isNavActive = (item) =>
    location.pathname === item.to ||
    (item.to === "/admin/branches" && location.pathname.startsWith("/admin/branches")) ||
    (item.to === "/admin/qr-menu" && location.pathname.startsWith("/admin/qr-menu"));

  return (
    <div className={`admin-shell ${navOpen ? "admin-shell--nav-open" : ""}`}>
      <button
        type="button"
        className="admin-sidebar-backdrop"
        aria-label="Menüyü kapat"
        onClick={() => setNavOpen(false)}
        tabIndex={navOpen ? 0 : -1}
      />

      <aside className="admin-sidebar">
        <div className="admin-brand">
          <strong>Admin Panel</strong>
          <span>{user?.firmName || "Firma Yönetimi"}</span>
        </div>
        <nav className="admin-nav">
          {adminNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              end={item.end}
              className={isNavActive(item) ? "active" : ""}
              onClick={() => setNavOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button type="button" className="admin-back admin-logout-btn" onClick={handleLogout}>
          <i className="fa fa-power-off" /> Çıkış Yap
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-mobile-header">
          <button
            type="button"
            className={`menu-hamburger ${navOpen ? "is-open" : ""}`}
            aria-label={navOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className="admin-mobile-header__title">
            <strong>Admin Panel</strong>
            <span>{user?.firmName}</span>
          </div>
        </header>

        <header className="admin-topbar">
          <div className="admin-topbar__info">
            <strong>{user?.firmName}</strong>
            <span>{user?.email}</span>
          </div>
          <Link to="/login" className="admin-pos-link" target="_blank" rel="noopener noreferrer">
            <span className="admin-pos-link__full">POS giriş sayfası ↗</span>
            <span className="admin-pos-link__short">POS ↗</span>
          </Link>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
