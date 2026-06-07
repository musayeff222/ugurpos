import { useEffect, useRef, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import MobileMenu from "../components/MobileMenu";
import ImpersonationBanner from "../components/ImpersonationBanner";
import "../styles/layout.css";
import "../styles/mobile-menu.css";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 992px)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 992px)");
    const onChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

export default function MainLayout() {
  const { isAuthenticated, isAdmin, isBranchUser, isImpersonating } = useAuth();
  const location = useLocation();
  const isDesktop = useIsDesktop();
  const [menuOpen, setMenuOpen] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 992px)").matches : true
  );
  const skipMenuClose = useRef(true);

  useEffect(() => {
    if (skipMenuClose.current) {
      skipMenuClose.current = false;
      return;
    }
    setMenuOpen(false);
  }, [location.pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (isAdmin && !isBranchUser && !isImpersonating) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div
      id="containerbar"
      className={`app-shell ${isDesktop && menuOpen ? "sidebar-open" : "sidebar-closed"} ${
        !isDesktop && location.pathname === "/menu" ? "mobile-menu-shell" : ""
      }`}
    >
      {isDesktop && <Sidebar onNavigate={() => setMenuOpen(false)} />}
      {!isDesktop && menuOpen && location.pathname !== "/menu" && (
        <MobileMenu overlay onClose={() => setMenuOpen(false)} />
      )}
      <div className="rightbar">
        {isImpersonating && <ImpersonationBanner />}
        {isDesktop || location.pathname !== "/menu" ? (
          <Topbar menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((open) => !open)} />
        ) : null}
        <div className={`contentbar ${location.pathname === "/menu" ? "contentbar-menu" : ""}`}>
          <Outlet />
        </div>
      </div>
      {!isDesktop && location.pathname !== "/menu" && (
        <Link to="/menu" className="mobile-home-fab" aria-label="Ana menü">
          <i className="fa fa-th-large" />
        </Link>
      )}
    </div>
  );
}
