import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWebOrders } from "../context/WebOrdersContext";
import { mobileMenuItems } from "../data/mobileMenu";
import "../styles/mobile-menu.css";

export default function MobileMenu({ overlay = false, onClose }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { pendingCount } = useWebOrders();

  const handleItem = (path) => {
    navigate(path);
    onClose?.();
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={`mobile-menu ${overlay ? "mobile-menu-overlay" : "mobile-menu-page"}`}>
      <div className="mobile-hero">
        <div className="mobile-hero-top">
          {overlay ? (
            <button type="button" className="mobile-hero-icon-btn" onClick={onClose} aria-label="Kapat">
              <i className="fa fa-arrow-left" />
            </button>
          ) : (
            <span className="mobile-hero-spacer" />
          )}
          <h1 className="mobile-hero-title">UgurPOS</h1>
          <div className="mobile-hero-actions">
            <Link to="/profile" className="mobile-hero-icon-btn" onClick={onClose}>
              <i className="fa fa-user-circle-o" />
            </Link>
            <Link to="/notices" className="mobile-hero-icon-btn" onClick={onClose}>
              <i className="fa fa-bell-o" />
            </Link>
            <button type="button" className="mobile-hero-icon-btn" onClick={handleLogout} aria-label="Çıkış">
              <i className="fa fa-sign-out" />
            </button>
          </div>
        </div>
        <p className="mobile-hero-firm">{user?.firmName || "Firma"}</p>
        <p className="mobile-hero-role">Yönetici</p>
      </div>

      <div className="mobile-menu-body">
        <div className="mobile-menu-grid">
          {mobileMenuItems.map((item) => (
            <button
              key={item.path + item.label}
              type="button"
              className="mobile-menu-card"
              onClick={() => handleItem(item.path)}
            >
              <i className={`fa ${item.icon} mobile-menu-card-icon`} />
              <span className="mobile-menu-card-label">{item.label}</span>
              {item.badge === "webOrders" && pendingCount > 0 && (
                <span className="mobile-menu-badge">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
