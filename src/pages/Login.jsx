import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import LanguageSwitcher from "../components/public/LanguageSwitcher";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import "../styles/login.css";

export default function Login() {
  const { loginBranch, loginStaff, isAuthenticated, isAdmin, isBranchUser } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginType, setLoginType] = useState("branch");
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

    if (!email.trim() || !password.trim()) {
      setError(t("login.errorEmpty"));
      return;
    }

    try {
      if (loginType === "staff") await loginStaff(email.trim(), password);
      else await loginBranch(email.trim(), password);
      const isMobile = window.matchMedia("(max-width: 991px)").matches;
      navigate(location.state?.from?.pathname || (isMobile ? "/menu" : "/dashboard"), { replace: true });
    } catch (err) {
      setError(err.message === "Invalid credentials" ? t("login.errorInvalid") : err.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-lang-bar">
        <LanguageSwitcher compact />
      </div>
      <div className="login-container">
        <div className="login-grid">
          <div className="login-card">
            <form onSubmit={handleSubmit}>
              <h4>{t("login.title")}</h4>
              <p className="login-hint">{t("login.hint")}</p>

              <div className="login-type-toggle">
                <button
                  type="button"
                  className={loginType === "branch" ? "active" : ""}
                  onClick={() => setLoginType("branch")}
                >
                  Şube
                </button>
                <button
                  type="button"
                  className={loginType === "staff" ? "active" : ""}
                  onClick={() => setLoginType("staff")}
                >
                  Personel
                </button>
              </div>

              <div className="form-group">
                <input
                  type={loginType === "staff" ? "text" : "email"}
                  placeholder={loginType === "staff" ? "Personel login" : t("login.email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <input
                  type="password"
                  placeholder={t("login.password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              {error && <p className="login-error">{error}</p>}

              <button type="submit" className="btn-login">
                {t("login.submit")}
              </button>

              <div className="login-links">
                <Link to="/login/admin">{t("login.adminLink")}</Link>
              </div>
            </form>
          </div>

          <div className="login-promo">
            <h4>Mağazanız için tüm ihtiyaçlarınız tek uygulamada!</h4>
            <p>
              Web, mobil ve masaüstü tüm platformlarda satış, stok, ürün yönetimi, raporlama ve cari hesap takibi.
            </p>
            <h4>Her şube ayrı</h4>
            <p>
              Şube e-postası ve şifre admin panelden oluşturulur. Yönetim için <Link to="/login/admin">/login/admin</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
