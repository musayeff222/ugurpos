import { useEffect, useRef, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWebOrders } from "../context/WebOrdersContext";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import MobileMenu from "../components/MobileMenu";
import ImpersonationBanner from "../components/ImpersonationBanner";
import useIsDesktop from "../hooks/useIsDesktop";
import "../styles/layout.css";
import "../styles/mobile-menu.css";

export default function MainLayout() {
  const { isAuthenticated, isAdmin, isBranchUser, isImpersonating } = useAuth();
  const { latestOrder, clearLatest } = useWebOrders();
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
        {isDesktop || (location.pathname !== "/menu" && location.pathname !== "/preport") ? (
          <Topbar menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((open) => !open)} />
        ) : null}
        <div
          className={`contentbar ${location.pathname === "/menu" ? "contentbar-menu" : ""} ${
            location.pathname === "/sales" && !isDesktop ? "contentbar-sales-mobile" : ""
          } ${location.pathname === "/preport" && !isDesktop ? "contentbar-report-mobile" : ""}`}
        >
          {latestOrder && location.pathname !== "/web-orders" && (
            <Link to="/web-orders" className="web-order-toast" onClick={clearLatest}>
              <strong>Yeni web siparişi:</strong> {latestOrder.code} — {latestOrder.customerName} (
              {latestOrder.deliveryAddress || latestOrder.tableNo
                ? `Ünvan: ${latestOrder.deliveryAddress || latestOrder.tableNo}`
                : "ünvan yok"})
              <span className="web-order-toast-link">Görüntüle →</span>
            </Link>
          )}
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
