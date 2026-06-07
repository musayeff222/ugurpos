import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/login.css";

export default function Login() {
  const { loginBranch, isAuthenticated, isAdmin, isBranchUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [branchCode, setBranchCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (isAuthenticated && isBranchUser) {
    const dest =
      location.state?.from?.pathname || (window.matchMedia("(max-width: 991px)").matches ? "/menu" : "/dashboard");
    return <Navigate to={dest} replace />;
  }

  if (isAuthenticated && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!branchCode.trim() || !password.trim()) {
      setError("Şube kodu ve parola girin.");
      return;
    }

    try {
      await loginBranch(branchCode.trim().toUpperCase(), password);
      const isMobile = window.matchMedia("(max-width: 991px)").matches;
      navigate(location.state?.from?.pathname || (isMobile ? "/menu" : "/dashboard"), { replace: true });
    } catch (err) {
      setError(err.message === "Invalid credentials" ? "Geçersiz şube kodu veya parola." : err.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-grid">
          <div className="login-card">
            <form onSubmit={handleSubmit}>
              <h4>POS — Şube Girişi</h4>
              <p className="login-hint">Satış, stok ve kasa işlemleri için şube kodunuz ile giriş yapın.</p>

              <div className="form-group">
                <input
                  type="text"
                  placeholder="Şube Giriş Kodu"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <input
                  type="password"
                  placeholder="Şube Parolası"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              {error && <p className="login-error">{error}</p>}

              <button type="submit" className="btn-login">
                POS&apos;a Gir
              </button>

              <div className="login-links">
                <Link to="/login/admin">Yönetici / Admin girişi →</Link>
              </div>
            </form>
          </div>

          <div className="login-promo">
            <h4>Mağazanız için tüm ihtiyaçlarınız tek uygulamada!</h4>
            <p>
              Web, mobil ve masaüstü tüm platformlarda satış, stok, ürün yönetimi, raporlama ve cari hesap takibi.
            </p>
            <h4>Her şube ayrı</h4>
            <p>Şube kodu ve parola admin panelden oluşturulur. Yönetim için <Link to="/login/admin">/login/admin</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
