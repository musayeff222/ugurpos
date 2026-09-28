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
    <div className="crm-login">
      <form onSubmit={handleSubmit}>
        <div className="erp-brand crm-login__brand">
          <div className="erp-brand__mark">UP</div>
          <div>
            <strong>UgurPOS</strong>
            <span>Console</span>
          </div>
        </div>
        <h1>Yönetici oturumu</h1>
        <p className="crm-login__hint">Firma konsolu · şube POS’undan ayrıdır</p>
        <label className="erp-field">
          <span>Kullanıcı adı</span>
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
          Oturum aç
        </button>
        <Link className="crm-login__pos" to="/login">
          POS / şube girişi
        </Link>
      </form>
    </div>
  );
}
