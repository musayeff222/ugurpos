import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWebOrders } from "../context/WebOrdersContext";
import LanguageSwitcher from "./public/LanguageSwitcher";

export default function Topbar({ menuOpen, onMenuToggle }) {
  const { user, logout, activeBranchName } = useAuth();
  const { pendingCount } = useWebOrders();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div className="togglebar">
          <button
            type="button"
            className={`menu-hamburger ${menuOpen ? "is-open" : ""}`}
            aria-label="Menü"
            aria-expanded={menuOpen}
            onClick={onMenuToggle}
          >
            <span />
            <span />
            <span />
          </button>
          <form className="topbar-search" onSubmit={(e) => e.preventDefault()}>
            <input type="text" placeholder="Merak ettiklerini ara..." />
            <button type="submit" aria-label="Ara">
              <i className="fa fa-search" />
            </button>
          </form>
        </div>

        <div className="infobar">
          <LanguageSwitcher compact />
          <Link to="/web-orders" className="icon-btn web-orders-bell" aria-label="Web siparişler">
            <i className="fa fa-bell-o" />
            {pendingCount > 0 && <span className="topbar-badge">{pendingCount}</span>}
          </Link>

          <span className="top-link branch-locked">
            {activeBranchName || user?.branchName || "Şube"} <i className="fa fa-lock" />
          </span>

          <div className="dropdown-wrap">
            <button type="button" className="icon-btn" onClick={() => setProfileOpen(!profileOpen)} aria-label="Profil">
              <i className="fa fa-th-large" />
            </button>
            {profileOpen && (
              <div className="dropdown-menu profile-menu">
                <Link to="/profile" onClick={() => setProfileOpen(false)}>
                  <i className="fa fa-gear" /> Profilim
                </Link>
                <Link to="/integration" onClick={() => setProfileOpen(false)}>
                  <i className="fa fa-refresh" /> Entegrasyon Bilgisi
                </Link>
                <Link to="/buyingInformation" onClick={() => setProfileOpen(false)}>
                  <i className="fa fa-credit-card" /> Lisans Satın Al
                </Link>
                <button type="button" className="dropdown-item logout" onClick={handleLogout}>
                  <i className="fa fa-power-off" /> Çıkış Yap
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
