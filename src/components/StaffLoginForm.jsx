import { useState } from "react";
import { useLocale } from "../context/LocaleContext";

export default function StaffLoginForm({ onSubmit, loading = false, compact = false }) {
  const { t } = useLocale();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!login.trim() || !password.trim()) {
      setError(t("login.staffErrorEmpty"));
      return;
    }
    try {
      await onSubmit(login.trim(), password);
      setLogin("");
      setPassword("");
    } catch (err) {
      setError(err.message === "Invalid credentials" ? t("login.staffErrorInvalid") : err.message);
    }
  };

  return (
    <form className={`staff-login-form${compact ? " staff-login-form--compact" : ""}`} onSubmit={handleSubmit}>
      {!compact && <p className="staff-login-form__hint">{t("login.staffHint")}</p>}
      <div className="form-group">
        <input
          type="text"
          placeholder={t("login.staffLogin")}
          value={login}
          onChange={(e) => setLogin(e.target.value)}
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
      <button type="submit" className="btn-login" disabled={loading}>
        {loading ? "…" : t("login.staffSubmit")}
      </button>
    </form>
  );
}
