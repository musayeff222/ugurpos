import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/admin.css";

const adminNav = [
  { to: "/admin", label: "Özet", end: true },
  { to: "/admin/branches", label: "Şubeler" },
];

export default function AdminLayout() {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <strong>Admin Panel</strong>
          <span>Şube yönetimi</span>
        </div>
        <nav className="admin-nav">
          {adminNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              end={item.end}
              className={location.pathname === item.to ? "active" : ""}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link to="/dashboard" className="admin-back">
          <i className="fa fa-arrow-left" /> POS paneline dön
        </Link>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
