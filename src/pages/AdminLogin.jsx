import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/login.css";
import "../styles/admin.css";

export default function AdminLogin() {
  const { login, logout, isAuthenticated, isAdmin, isBranchUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (isAuthenticated && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (isAuthenticated && isBranchUser) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("E-posta ve parola girin.");
      return;
    }
    setError("");
    try {
      const account = await login(email.trim(), password);
      if (account.role !== "admin") {
        logout();
        setError("Bu giriş yalnızca yöneticiler içindir. Şube girişi için POS sayfasını kullanın.");
        return;
      }
      navigate(location.state?.from?.pathname || "/admin", { replace: true });
    } catch (err) {
      setError(err.message === "Invalid credentials" ? "Geçersiz e-posta veya parola." : err.message);
    }
  };

  return (
    <div className="login-page admin-login-page">
      <div className="login-container admin-login-container">
        <div className="login-grid admin-login-grid">
          <div className="login-card admin-login-card">
            <form onSubmit={handleSubmit}>
              <div className="admin-login-badge">Yönetim Paneli</div>
              <h4>Admin Girişi</h4>
              <p className="login-hint">Şube yönetimi ve firma ayarları için ayrı giriş ekranı.</p>

              <div className="form-group">
                <input
                  type="text"
                  placeholder="Yönetici e-posta"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div className="form-group">
                <input
                  type="password"
                  placeholder="Parola"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              {error && <p className="login-error">{error}</p>}

              <button type="submit" className="btn-login admin-login-btn">
                Admin Paneline Gir
              </button>

              <div className="login-links">
                <Link to="/login">← POS / Şube girişi</Link>
              </div>
            </form>
          </div>

          <div className="login-promo admin-login-promo">
            <h4>Merkezi yönetim</h4>
            <p>Şube oluşturma, giriş kodları, parola yönetimi ve firma özeti bu panelden yapılır.</p>
            <p>POS satış ekranı şube personeli için ayrı adreste: <strong>/login</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}
