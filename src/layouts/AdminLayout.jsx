import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/admin.css";

const adminNav = [
  { to: "/admin", label: "Özet", icon: "fa-home", end: true },
  { to: "/admin/branches", label: "Şubeler", icon: "fa-building" },
  { to: "/admin/qr-menu", label: "QR Menü", icon: "fa-qrcode" },
];

export default function AdminLayout() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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

  const pageTitle =
    adminNav.find((item) => isNavActive(item))?.label ||
    (location.pathname.includes("/branches/new") ? "Yeni Şube" : "Admin");

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar admin-sidebar--desktop">
        <div className="admin-brand">
          <strong>UgurPOS</strong>
          <span>{user?.firmName || "Yönetim"}</span>
        </div>
        <nav className="admin-nav">
          {adminNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              end={item.end}
              className={isNavActive(item) ? "active" : ""}
            >
              <i className={`fa ${item.icon}`} aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <Link to="/login" className="admin-sidebar-link" target="_blank" rel="noopener noreferrer">
            <i className="fa fa-external-link" /> POS girişi
          </Link>
          <button type="button" className="admin-back admin-logout-btn" onClick={handleLogout}>
            <i className="fa fa-power-off" /> Çıkış
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-mobile-header">
          <div className="admin-mobile-header__title">
            <strong>{pageTitle}</strong>
            <span>{user?.firmName}</span>
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

        <header className="admin-topbar admin-topbar--desktop">
          <div className="admin-topbar__info">
            <strong>{user?.firmName}</strong>
            <span>{user?.email}</span>
          </div>
          <Link to="/login" className="admin-pos-link" target="_blank" rel="noopener noreferrer">
            POS giriş sayfası ↗
          </Link>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </main>

      <nav className="admin-bottom-nav" aria-label="Admin menü">
        {adminNav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            end={item.end}
            className={`admin-bottom-nav__item ${isNavActive(item) ? "active" : ""}`}
          >
            <i className={`fa ${item.icon}`} aria-hidden />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
