import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import LanguageSwitcher from "../components/public/LanguageSwitcher";
import StaffLoginForm from "../components/StaffLoginForm";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { getPostLoginPath } from "../utils/authRedirect";
import "../styles/login.css";

export default function Login() {
  const { loginBranch, loginStaff, isAuthenticated, isAdmin, isBranchUser, user, loading } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginType, setLoginType] = useState("branch");
  const [error, setError] = useState("");

  if (isAuthenticated && isBranchUser) {
    return <Navigate to={getPostLoginPath(user, location.state?.from?.pathname)} replace />;
  }

  if (isAuthenticated && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError(t("login.errorEmpty"));
      return;
    }

    try {
      const account = await loginBranch(email.trim(), password);
      navigate(getPostLoginPath(account, location.state?.from?.pathname), { replace: true });
    } catch (err) {
      setError(err.message === "Invalid credentials" ? t("login.errorInvalid") : err.message);
    }
  };

  const handleStaffSubmit = async (staffLogin, staffPassword) => {
    const account = await loginStaff(staffLogin, staffPassword);
    navigate(getPostLoginPath(account, location.state?.from?.pathname), { replace: true });
  };

  return (
    <div className="login-page">
      <div className="login-lang-bar">
        <LanguageSwitcher compact />
      </div>
      <div className="login-container">
        <div className="login-grid">
          <div className="login-card">
            <h4>{loginType === "staff" ? t("login.staffTitle") : t("login.title")}</h4>
            <p className="login-hint">{loginType === "staff" ? t("login.staffHint") : t("login.hint")}</p>

            <div className="login-type-toggle">
              <button
                type="button"
                className={loginType === "branch" ? "active" : ""}
                onClick={() => {
                  setLoginType("branch");
                  setError("");
                }}
              >
                {t("login.branchTab")}
              </button>
              <button
                type="button"
                className={loginType === "staff" ? "active" : ""}
                onClick={() => {
                  setLoginType("staff");
                  setError("");
                }}
              >
                {t("login.staffTab")}
              </button>
            </div>

            {loginType === "branch" ? (
              <form onSubmit={handleBranchSubmit}>
                <div className="form-group">
                  <input
                    type="email"
                    placeholder={t("login.email")}
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

                <p className="login-switch-hint">
                  {t("login.staffSwitchHint")}{" "}
                  <button type="button" className="login-switch-link" onClick={() => setLoginType("staff")}>
                    {t("login.staffTab")}
                  </button>
                </p>
              </form>
            ) : (
              <StaffLoginForm onSubmit={handleStaffSubmit} loading={loading} />
            )}

            <div className="login-links">
              <Link to="/login/admin">{t("login.adminLink")}</Link>
            </div>
          </div>

          <div className="login-promo">
            <h4>Mağazanız için tüm ihtiyaçlarınız tek uygulamada!</h4>
            <p>
              Web, mobil ve masaüstü tüm platformlarda satış, stok, ürün yönetimi, raporlama ve cari hesap takibi.
            </p>
            <h4>Her şube ayrı</h4>
            <p>
              Şube e-postası ve şifre admin panelden oluşturulur. Kasiyer personal login ilə satış ekranına daxil ola
              bilər.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
