import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { elT } from "../../i18n/eleman";
import { initElemanPwa } from "../../utils/elemanPwa";
import "../../styles/eleman.css";

export default function ElemanLogin() {
  const { loginEleman, isAuthenticated, user, logout } = useAuth();
  const { lang } = useLocale();
  const t = (key) => elT(lang, key);
  const navigate = useNavigate();
  const location = useLocation();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    initElemanPwa();
  }, []);

  if (isAuthenticated && user?.loginType === "eleman") {
    return <Navigate to="/eleman" replace />;
  }

  if (isAuthenticated && user?.loginType !== "eleman") {
    return <Navigate to={user?.role === "admin" ? "/admin" : "/sales"} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!login.trim() || !password.trim()) {
      setError(t("login.need"));
      return;
    }
    setBusy(true);
    try {
      const account = await loginEleman(login.trim(), password);
      if (account.loginType !== "eleman") {
        logout();
        setError(t("login.bad"));
        return;
      }
      navigate(location.state?.from?.pathname || "/eleman", { replace: true });
    } catch (err) {
      setError(err.message === "Invalid credentials" ? t("login.bad") : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="el-login">
      <div className="el-login__glow" aria-hidden />
      <form className="el-login__card" onSubmit={handleSubmit}>
        <img className="el-login__logo" src="/icons/cigkofte-192.png" alt="İstanbul Çiğköfte" />
        <p className="el-login__kicker">İstanbul Çiğköfte</p>
        <h1>{t("login.title")}</h1>
        <p className="el-login__hint">{t("login.hint")}</p>
        <label className="el-field">
          <span>Login</span>
          <input
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="username"
            inputMode="text"
            placeholder="məsələn mustafa"
          />
        </label>
        <label className="el-field">
          <span>{t("login.pass")}</span>
          <div className="el-login__pass">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••"
            />
            <button type="button" onClick={() => setShowPass((open) => !open)}>
              {showPass ? t("login.hide") : t("login.show")}
            </button>
          </div>
        </label>
        {error && <p className="el-login__error">{error}</p>}
        <button type="submit" className="el-login__submit" disabled={busy}>
          {busy ? t("login.busy") : t("login.submit")}
        </button>
      </form>
    </div>
  );
}
