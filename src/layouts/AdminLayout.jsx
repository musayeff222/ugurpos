import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/admin.css";

const adminNav = [
  { to: "/admin", label: "Özet", end: true },
  { to: "/admin/branches", label: "Şubeler" },
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

  return (
    <div className="admin-shell">
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
              className={
                location.pathname === item.to ||
                (item.to === "/admin/branches" && location.pathname.startsWith("/admin/branches"))
                  ? "active"
                  : ""
              }
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
        <header className="admin-topbar">
          <div>
            <strong>{user?.firmName}</strong>
            <span>{user?.email}</span>
          </div>
          <Link to="/login" className="admin-pos-link" target="_blank" rel="noopener noreferrer">
            POS giriş sayfası ↗
          </Link>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
