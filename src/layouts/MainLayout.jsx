import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import "../styles/layout.css";

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
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isDesktop = useIsDesktop();
  const [menuOpen, setMenuOpen] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 992px)").matches : true
  );

  useEffect(() => {
    if (!isDesktop) {
      setMenuOpen(false);
    }
  }, [location.pathname, isDesktop]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div id="containerbar" className={`app-shell ${menuOpen ? "sidebar-open" : "sidebar-closed"}`}>
      {!isDesktop && menuOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Menüyü kapat"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <Sidebar onNavigate={() => !isDesktop && setMenuOpen(false)} />
      <div className="rightbar">
        <Topbar menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((open) => !open)} />
        <div className="contentbar">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
