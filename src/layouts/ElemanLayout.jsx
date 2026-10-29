import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/eleman.css";

const MENU = [
  { to: "/eleman", label: "Ana səhifə", icon: "fa-house", end: true },
  { to: "/eleman/alis", label: "Alış", icon: "fa-cart-shopping" },
  { to: "/eleman/veris", label: "Veriş", icon: "fa-truck" },
  { to: "/eleman/franchise", label: "Franchise", icon: "fa-store" },
  { to: "/eleman/emeliyyatlar", label: "Əməliyyatlar", icon: "fa-list" },
  { to: "/eleman/axtaris", label: "Axtarış", icon: "fa-magnifying-glass" },
  { to: "/eleman/ayarlar", label: "Ayarlar", icon: "fa-gear" },
  { to: "/eleman/logolar", label: "Loqolar", icon: "fa-image" },
];

export default function ElemanLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle("el-lock", menuOpen);
    return () => document.body.classList.remove("el-lock");
  }, [menuOpen]);

  if (!isAuthenticated) {
    return <Navigate to="/eleman-login" replace state={{ from: location }} />;
  }

  if (user?.loginType !== "eleman") {
    return <Navigate to="/login/admin" replace />;
  }

  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.staffName || user.email;
  const nested = location.pathname !== "/eleman";

  return (
    <div className="el-shell">
      <header className="el-top">
        <button type="button" className="el-top__menu" onClick={() => setMenuOpen(true)} aria-label="Menyu">
          <i className="fa-solid fa-bars" />
        </button>
        {nested ? (
          <button type="button" className="el-top__back" onClick={() => navigate("/eleman")}>
            Geri
          </button>
        ) : null}
        <Link to="/eleman" className="el-top__who">
          <span className="el-login__mark el-login__mark--sm">İK</span>
          <span>
            <strong>{name}</strong>
            <small>Əlman</small>
          </span>
        </Link>
      </header>

      {menuOpen ? (
        <div className="el-drawer" role="dialog" aria-modal="true">
          <aside className="el-drawer__panel">
            <div className="el-drawer__head">
              <span className="el-login__mark">İK</span>
              <div>
                <strong>{name}</strong>
                <small>{user.firmName || "İstanbul Çiğköfte"}</small>
              </div>
              <button type="button" className="el-drawer__close" onClick={() => setMenuOpen(false)} aria-label="Bağla">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <nav className="el-drawer__nav">
              {MENU.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={Boolean(item.end)}
                  className={({ isActive }) => `el-drawer__link${isActive ? " is-on" : ""}`}
                >
                  <i className={`fa-solid ${item.icon}`} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <button
              type="button"
              className="el-drawer__out"
              onClick={() => {
                logout();
                navigate("/eleman-login", { replace: true });
              }}
            >
              <i className="fa-solid fa-right-from-bracket" />
              Çıxış
            </button>
          </aside>
          <button type="button" className="el-drawer__dim" aria-label="Bağla" onClick={() => setMenuOpen(false)} />
        </div>
      ) : null}

      <Outlet />
    </div>
  );
}
