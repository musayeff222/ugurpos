import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { elT } from "../i18n/eleman";
import { initElemanPwa } from "../utils/elemanPwa";
import "../styles/eleman.css";

const MENU = [
  { to: "/eleman", key: "menu.home", icon: "fa-house", end: true },
  { to: "/eleman/ana-ekran", key: "menu.install", icon: "fa-mobile-screen" },
  { to: "/eleman/alis", key: "menu.alis", icon: "fa-cart-shopping" },
  { to: "/eleman/alis-tarixce", key: "menu.alisHistory", icon: "fa-receipt" },
  { to: "/eleman/veris", key: "menu.veris", icon: "fa-truck" },
  { to: "/eleman/veris-tarixce", key: "menu.verisHistory", icon: "fa-clipboard-list" },
  { to: "/eleman/franchise", key: "menu.franchise", icon: "fa-store" },
  { to: "/eleman/emeliyyatlar", key: "menu.ops", icon: "fa-list" },
  { to: "/eleman/axtaris", key: "menu.search", icon: "fa-magnifying-glass" },
  { to: "/eleman/ayarlar", key: "menu.settings", icon: "fa-gear" },
];

export default function ElemanLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const { lang } = useLocale();
  const t = (key) => elT(lang, key);
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    initElemanPwa();
  }, []);

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
        <button type="button" className="el-top__menu" onClick={() => setMenuOpen(true)} aria-label={t("menu.home")}>
          <i className="fa-solid fa-bars" />
        </button>
        {nested ? (
          <button type="button" className="el-top__back" onClick={() => navigate("/eleman")}>
            {t("menu.back")}
          </button>
        ) : null}
        <Link to="/eleman" className="el-top__who">
          <img className="el-top__logo" src="/icons/cigkofte-192.png" alt="İstanbul Çiğköfte" />
          <span>
            <strong>{name}</strong>
            <small>{t("role")}</small>
          </span>
        </Link>
      </header>

      {menuOpen ? (
        <div className="el-drawer" role="dialog" aria-modal="true">
          <aside className="el-drawer__panel">
            <div className="el-drawer__head">
              <img className="el-drawer__logo" src="/icons/cigkofte-192.png" alt="İstanbul Çiğköfte" />
              <div>
                <strong>{name}</strong>
                <small>{user.firmName || "İstanbul Çiğköfte"}</small>
              </div>
              <button type="button" className="el-drawer__close" onClick={() => setMenuOpen(false)} aria-label={t("menu.close")}>
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
                  {t(item.key)}
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
              {t("menu.logout")}
            </button>
          </aside>
          <button type="button" className="el-drawer__dim" aria-label={t("menu.close")} onClick={() => setMenuOpen(false)} />
        </div>
      ) : null}

      <Outlet />
    </div>
  );
}
