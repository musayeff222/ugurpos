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
    <div className="erp-login">
      <aside className="erp-login__brand">
        <div className="erp-brand">
          <div className="erp-brand__mark">UP</div>
          <div>
            <strong>UgurPOS</strong>
            <span>Super Admin ERP</span>
          </div>
        </div>
        <h1>Bütün şubeler. Tek komuta.</h1>
        <ul>
          <li>Şube CRM ve stok</li>
          <li>Kasa, ciro, gün sonu</li>
          <li>QR / web sipariş</li>
          <li>Canlı hareket akışı</li>
        </ul>
        <Link to="/login">POS / şube girişi →</Link>
      </aside>
      <main className="erp-login__form">
        <form onSubmit={handleSubmit}>
          <p className="erp-kicker">Güvenli giriş</p>
          <h2>Super Admin</h2>
          <label className="erp-field">
            <span>Yönetici e-posta</span>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="erp-field">
            <span>Parola</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="btn-login admin-login-btn">
            Panele gir
          </button>
        </form>
      </main>
    </div>
  );
}
