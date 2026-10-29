import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, setToken } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { ELEMAN_LANGS, elT } from "../../i18n/eleman";
import { formatDateTime, formatMoney } from "../../utils/format";
import ElemanInvoiceScreen from "./ElemanInvoiceScreen";

function Placeholder({ title, text }) {
  return (
    <div className="el-page">
      <div className="el-pagehead">
        <div>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
      </div>
      <article className="el-card" style={{ cursor: "default" }}>
        <span>Tezliklə</span>
        <strong>{title}</strong>
        <small>Bu bölmənin nə üçün olduğunu sonra deyəcəksiniz.</small>
      </article>
    </div>
  );
}

export function ElemanFranchise() {
  return <Placeholder title="Franchise" text="Bu kartın nə üçün olduğunu sonra deyəcəksiniz." />;
}

export function ElemanAyarlar() {
  const { user, patchUser } = useAuth();
  const { lang, setLang } = useLocale();
  const t = (key) => elT(lang, key);
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.staffName || "";
  const [login, setLogin] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const loginChanged = login.trim() && login.trim().toLowerCase() !== String(user?.email || "").toLowerCase();
    if ((loginChanged || password) && !currentPassword) {
      setError(t("settings.needPass"));
      return;
    }
    if (!loginChanged && !password) {
      setMessage(t("settings.saved"));
      return;
    }
    setSaving(true);
    try {
      const next = await api.updateElemanProfile({
        login: login.trim(),
        currentPassword,
        password,
      });
      if (next.token) setToken(next.token);
      if (next.user) patchUser(next.user);
      setCurrentPassword("");
      setPassword("");
      setMessage(t("settings.saved"));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="el-page">
      <div className="el-pagehead">
        <div>
          <h2>{t("settings.title")}</h2>
          <p>{t("settings.hint")}</p>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}
      <article className="el-card" style={{ cursor: "default", marginBottom: 14 }}>
        <span>{t("role")}</span>
        <strong>{name}</strong>
        <small>{user?.email || ""}</small>
      </article>
      <div className="el-langs">
        <span>{t("settings.lang")}</span>
        <div>
          {ELEMAN_LANGS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={lang === item.id ? "is-on" : ""}
              onClick={() => setLang(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <form className="el-settings" onSubmit={save}>
        <label className="el-field">
          <span>{t("settings.login")}</span>
          <input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" />
        </label>
        <label className="el-field">
          <span>{t("settings.currentPass")}</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <label className="el-field">
          <span>{t("settings.newPass")}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <button type="submit" className="el-login__submit" disabled={saving}>
          {saving ? t("settings.saving") : t("settings.save")}
        </button>
      </form>
    </div>
  );
}

function useOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.getElemanOverview().then(setData).catch((err) => setError(err.message));
  }, []);
  return { data, error };
}

export function ElemanEmeliyyatlar() {
  const { user } = useAuth();
  const { lang } = useLocale();
  const t = (key) => elT(lang, key);
  const { data, error } = useOverview();
  const [invoice, setInvoice] = useState(null);
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.staffName || "";

  const rows = useMemo(() => {
    const purchases = (data?.purchases || []).map((row) => ({
      ...row,
      kind: "alis",
      stamp: row.createdAt,
      title: "Alış",
    }));
    const deliveries = (data?.deliveries || []).map((row) => ({
      ...row,
      kind: "veris",
      stamp: row.createdAt,
      title: row.branchName || "Veriş",
    }));
    return [...purchases, ...deliveries].sort((a, b) => String(b.stamp || "").localeCompare(String(a.stamp || "")));
  }, [data]);

  return (
    <div className="el-page">
      <div className="el-pagehead">
        <div>
          <h2>{t("menu.ops")}</h2>
          <p>{t("ops.hint")}</p>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <section className="el-history">
        {rows.map((row) =>
          row.kind === "alis" ? (
            <button key={row.id} type="button" onClick={() => setInvoice(row)}>
              <span>
                {t("menu.alis")} · {formatDateTime(row.createdAt, lang)}
              </span>
              <b>{formatMoney(row.total)}</b>
            </button>
          ) : (
            <Link key={row.id} to="/eleman/veris-tarixce">
              <span>
                {t("menu.veris")} · {row.title} · {row.status === "accepted" ? t("veris.accepted") : t("veris.pending")}
              </span>
              <b>{formatMoney(row.total)}</b>
            </Link>
          )
        )}
        {!rows.length && <p>{t("ops.empty")}</p>}
      </section>
      {invoice ? (
        <ElemanInvoiceScreen
          purchase={invoice}
          personName={name}
          storeName={user?.firmName}
          onClose={() => setInvoice(null)}
        />
      ) : null}
    </div>
  );
}

export function ElemanAxtaris() {
  const { user } = useAuth();
  const { lang } = useLocale();
  const t = (key) => elT(lang, key);
  const { data, error } = useOverview();
  const [query, setQuery] = useState("");
  const [invoice, setInvoice] = useState(null);
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.staffName || "";
  const needle = query.trim().toLocaleLowerCase("az");

  const rows = useMemo(() => {
    const hay = [
      ...(data?.purchases || []).map((row) => ({
        ...row,
        kind: "alis",
        label: `Alış ${(row.lines || []).map((line) => line.name).join(" ")}`,
      })),
      ...(data?.deliveries || []).map((row) => ({
        ...row,
        kind: "veris",
        label: `Veriş ${row.branchName || ""} ${(row.lines || []).map((line) => line.name).join(" ")}`,
      })),
    ];
    if (!needle) return hay;
    return hay.filter((row) => row.label.toLocaleLowerCase("az").includes(needle));
  }, [data, needle]);

  return (
    <div className="el-page">
      <div className="el-pagehead">
        <div>
          <h2>{t("menu.search")}</h2>
          <p>{t("search.hint")}</p>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <label className="el-field">
        <span>Axtar</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search.placeholder")} />
      </label>
      <section className="el-history">
        {rows.map((row) =>
          row.kind === "alis" ? (
            <button key={row.id} type="button" onClick={() => setInvoice(row)}>
              <span>
                {t("menu.alis")} · {formatDateTime(row.createdAt, lang)}
              </span>
              <b>{formatMoney(row.total)}</b>
            </button>
          ) : (
            <Link key={row.id} to="/eleman/veris-tarixce">
              <span>
                {t("menu.veris")} · {row.branchName} · {formatDateTime(row.createdAt, lang)}
              </span>
              <b>{formatMoney(row.total)}</b>
            </Link>
          )
        )}
        {!rows.length && <p>{t("search.empty")}</p>}
      </section>
      {invoice ? (
        <ElemanInvoiceScreen
          purchase={invoice}
          personName={name}
          storeName={user?.firmName}
          onClose={() => setInvoice(null)}
        />
      ) : null}
    </div>
  );
}
