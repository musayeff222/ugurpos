import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../store/StoreContext";

export default function Topbar({ menuOpen, onMenuToggle }) {
  const { user, logout, switchBranch, isAdmin, isBranchUser, branches, activeBranchId, activeBranchName } = useAuth();
  const { refresh } = useStore();
  const navigate = useNavigate();
  const [branchOpen, setBranchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");
  const [switching, setSwitching] = useState(false);

  const filteredBranches = useMemo(() => {
    const q = branchSearch.trim().toLocaleLowerCase("tr");
    const list = (branches || []).filter((b) => b.active);
    if (!q) return list;
    return list.filter((b) => b.name.toLocaleLowerCase("tr").includes(q));
  }, [branches, branchSearch]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSwitchBranch = async (branchId) => {
    if (branchId === activeBranchId || switching) return;
    setSwitching(true);
    try {
      await switchBranch(branchId);
      await refresh();
      setBranchOpen(false);
      setBranchSearch("");
    } finally {
      setSwitching(false);
    }
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

          <button type="button" className="icon-btn" aria-label="Mobil">
            <i className="fa fa-mobile" />
          </button>
          <button type="button" className="icon-btn" aria-label="Rehber">
            <i className="fa fa-address-book" />
          </button>

          {!isBranchUser && (
            <div className="dropdown-wrap">
              <button type="button" className="top-link" onClick={() => setBranchOpen(!branchOpen)}>
                {activeBranchName || user?.branchName || "ANA HESAP"} <i className="fa fa-sitemap" />
              </button>
              {branchOpen && (
                <div className="dropdown-menu branch-menu">
                  <p className="dropdown-hint">Geçiş yapmak istediğiniz şubenin üzerine tıklayınız</p>
                  <input
                    type="text"
                    placeholder="Şube adı yazınız..."
                    className="branch-search"
                    value={branchSearch}
                    onChange={(e) => setBranchSearch(e.target.value)}
                  />
                  {filteredBranches.map((branch) => (
                    <button
                      key={branch.id}
                      type="button"
                      className={`dropdown-item ${branch.id === activeBranchId ? "active-branch" : ""}`}
                      onClick={() => handleSwitchBranch(branch.id)}
                      disabled={switching}
                    >
                      <i className="fa fa-arrow-circle-o-right" /> {branch.name}
                    </button>
                  ))}
                  {isAdmin && (
                    <Link to="/admin/branches" className="dropdown-item strong" onClick={() => setBranchOpen(false)}>
                      Şube bilgileri / Yeni şube ekle
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {isBranchUser && (
            <span className="top-link branch-locked">
              {activeBranchName || user?.branchName} <i className="fa fa-lock" />
            </span>
          )}

          <div className="dropdown-wrap">
            <button type="button" className="icon-btn" onClick={() => setProfileOpen(!profileOpen)} aria-label="Profil">
              <i className="fa fa-th-large" />
            </button>
            {profileOpen && (
              <div className="dropdown-menu profile-menu">
                <Link to="/profile" onClick={() => setProfileOpen(false)}>
                  <i className="fa fa-gear" /> Profilim
                </Link>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setProfileOpen(false)}>
                    <i className="fa fa-shield" /> Admin Panel
                  </Link>
                )}
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
