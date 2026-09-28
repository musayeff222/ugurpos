import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import LanguageSwitcher from "../components/public/LanguageSwitcher";
import StaffLoginForm from "../components/StaffLoginForm";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { getPostLoginPath, isKasiyerAccount, isProductionAccount } from "../utils/authRedirect";
import "../styles/login.css";

const COPY = {
  sube: {
    title: "login.subeTitle",
    hint: "login.subeHint",
    wrong: "login.subeWrong",
  },
  istesalat: {
    title: "login.prodTitle",
    hint: "login.prodHint",
    wrong: "login.prodWrong",
  },
  kasiyer: {
    title: "login.kasiyerTitle",
    hint: "login.kasiyerHint",
    wrong: "login.kasiyerWrong",
    submit: "login.kasiyerSubmit",
  },
  persenol: {
    title: "login.personelTitle",
    hint: "login.personelHint",
    wrong: "login.personelWrong",
    submit: "login.personelSubmit",
  },
};

export default function Login({ mode = "sube" }) {
  const { loginBranch, loginStaff, logout, isAuthenticated, isAdmin, isBranchUser, user, loading } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const copy = COPY[mode] || COPY.sube;
  const isStaff = mode === "kasiyer" || mode === "persenol";

  if (isAuthenticated && isAdmin && !isBranchUser) {
    return <Navigate to="/admin" replace />;
  }

  if (isAuthenticated && isBranchUser) {
    return <Navigate to={getPostLoginPath(user, location.state?.from?.pathname)} replace />;
  }

  const rejectWrongAccount = (account) => {
    if (mode === "istesalat" && !isProductionAccount(account)) return t(COPY.istesalat.wrong);
    if (mode === "sube" && isProductionAccount(account)) return t(COPY.sube.wrong);
    if (mode === "kasiyer" && !isKasiyerAccount(account)) return t(COPY.kasiyer.wrong);
    if (mode === "persenol" && isKasiyerAccount(account)) return t(COPY.persenol.wrong);
    return "";
  };

  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError(t("login.errorEmpty"));
      return;
    }
    try {
      const account = await loginBranch(email.trim(), password);
      const wrong = rejectWrongAccount(account);
      if (wrong) {
        logout();
        setError(wrong);
        return;
      }
      sessionStorage.setItem("ugurpos_login_path", `/login/${mode}`);
      navigate(getPostLoginPath(account, location.state?.from?.pathname), { replace: true });
    } catch (err) {
      setError(err.message === "Invalid credentials" ? t("login.errorInvalid") : err.message);
    }
  };

  const handleStaffSubmit = async (staffLogin, staffPassword) => {
    const account = await loginStaff(staffLogin, staffPassword);
    const wrong = rejectWrongAccount(account);
    if (wrong) {
      logout();
      throw new Error(wrong);
    }
    sessionStorage.setItem("ugurpos_login_path", `/login/${mode}`);
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
            <h4>{t(copy.title)}</h4>
            <p className="login-hint">{t(copy.hint)}</p>

            {isStaff ? (
              <StaffLoginForm
                onSubmit={handleStaffSubmit}
                loading={loading}
                compact
                submitLabel={t(copy.submit)}
              />
            ) : (
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
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
