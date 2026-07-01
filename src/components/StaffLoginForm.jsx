import { useEffect, useMemo, useState } from "react";
import { useLocale } from "../context/LocaleContext";

function staffLabel(member) {
  return `${member.name || ""} ${member.surname || ""}`.trim() || member.login || "Personal";
}

export default function StaffLoginForm({
  staffList = [],
  branchEmail = "",
  onLoadStaff,
  onSubmit,
  loading = false,
  compact = false,
}) {
  const { t } = useLocale();
  const [email, setEmail] = useState(branchEmail);
  const [localStaff, setLocalStaff] = useState(staffList);
  const [selected, setSelected] = useState(null);
  const [password, setPassword] = useState("");
  const [login, setLogin] = useState("");
  const [error, setError] = useState("");
  const [loadingStaff, setLoadingStaff] = useState(false);

  useEffect(() => {
    setLocalStaff(staffList);
  }, [staffList]);

  useEffect(() => {
    if (branchEmail) setEmail(branchEmail);
  }, [branchEmail]);

  const eligibleStaff = useMemo(
    () => localStaff.filter((member) => member.hasPassword !== false && member.login),
    [localStaff]
  );

  const usePicker = eligibleStaff.length > 0 || !!onLoadStaff;

  const loadStaffList = async () => {
    if (!onLoadStaff || !email.trim()) {
      setError(t("login.errorEmpty"));
      return;
    }
    setLoadingStaff(true);
    setError("");
    try {
      const list = await onLoadStaff(email.trim());
      setLocalStaff(list);
      setSelected(null);
      setPassword("");
      if (!list.length) {
        setError(t("login.staffListEmpty"));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingStaff(false);
    }
  };

  const submitWithStaff = async (member, staffPassword) => {
    await onSubmit(member.login, staffPassword, { staffId: member.id });
    setPassword("");
    setSelected(null);
  };

  const handlePickerSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!selected) {
      setError(t("login.staffPickRequired"));
      return;
    }
    if (!password.trim()) {
      setError(t("login.staffErrorEmpty"));
      return;
    }
    try {
      await submitWithStaff(selected, password);
    } catch (err) {
      setError(err.message === "Invalid credentials" ? t("login.staffErrorInvalid") : err.message);
    }
  };

  const handleLegacySubmit = async (e) => {
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

  if (usePicker) {
    return (
      <div className={`staff-login-form${compact ? " staff-login-form--compact" : ""}`}>
        {!compact && <p className="staff-login-form__hint">{t("login.staffPickHint")}</p>}

        {onLoadStaff && !staffList.length && (
          <div className="staff-login-form__branch-row">
            <input
              type="email"
              placeholder={t("login.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="button" className="btn-login btn-login--secondary" onClick={loadStaffList} disabled={loadingStaff}>
              {loadingStaff ? "…" : t("login.staffLoadList")}
            </button>
          </div>
        )}

        {eligibleStaff.length > 0 && (
          <div className="staff-login-picker">
            {eligibleStaff.map((member) => (
              <button
                key={member.id}
                type="button"
                className={`staff-login-picker__item${selected?.id === member.id ? " active" : ""}`}
                onClick={() => {
                  setSelected(member);
                  setPassword("");
                  setError("");
                }}
              >
                <strong>{staffLabel(member)}</strong>
                <span>{member.role || "Kasiyer"}</span>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <form onSubmit={handlePickerSubmit}>
            <p className="staff-login-form__selected">
              {t("login.staffPasswordFor")} <strong>{staffLabel(selected)}</strong>
            </p>
            <div className="form-group">
              <input
                type="password"
                placeholder={t("login.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
              />
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? "…" : t("login.staffSubmit")}
            </button>
          </form>
        )}

        {!selected && error && <p className="login-error">{error}</p>}
      </div>
    );
  }

  return (
    <form className={`staff-login-form${compact ? " staff-login-form--compact" : ""}`} onSubmit={handleLegacySubmit}>
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
