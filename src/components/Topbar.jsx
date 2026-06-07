import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Topbar({ menuOpen, onMenuToggle }) {
  const { user, logout, activeBranchName } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);

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
          <div className="dropdown-wrap">
            <button type="button" className="icon-btn" onClick={() => setNotifyOpen(!notifyOpen)} aria-label="Duyurular">
              <i className="fa fa-bell-o" />
            </button>
            {notifyOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-title">Duyurular</div>
                <Link to="/notices" onClick={() => setNotifyOpen(false)}>
                  Yeni Özellik: E-posta İle Satış Performans Raporu
                </Link>
                <Link to="/notices" onClick={() => setNotifyOpen(false)}>
                  İki Faktörlü Doğrulama (2FA) Yayınlandı
                </Link>
                <Link to="/notices" className="dropdown-all" onClick={() => setNotifyOpen(false)}>
                  Tüm duyurular
                </Link>
              </div>
            )}
          </div>

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
