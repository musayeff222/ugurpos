import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { useLocale } from "../../context/LocaleContext";
import { elT } from "../../i18n/eleman";
import { formatMoney } from "../../utils/format";

export default function ElemanHome() {
  const { lang } = useLocale();
  const t = (key) => elT(lang, key);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getElemanOverview().then(setData).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="el-page">
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="el-grid">
        <article className="el-card">
          <span>{t("home.cash")}</span>
          <strong>{formatMoney(data?.balance || 0)}</strong>
          <small>{t("home.cashHint")}</small>
        </article>
        <Link to="/eleman/franchise" className="el-card">
          <span>{t("home.franchiseCash")}</span>
          <strong>{formatMoney(data?.franchiseBalance || 0)}</strong>
          <small>{t("home.franchiseHint")}</small>
        </Link>
        <Link to="/eleman/alis" className="el-card">
          <span>{t("menu.alis")}</span>
          <strong>{data?.purchases?.length || 0}</strong>
          <small>{t("home.alisHint")}</small>
        </Link>
        <Link to="/eleman/veris" className="el-card">
          <span>{t("menu.veris")}</span>
          <strong>{data?.deliveries?.length || 0}</strong>
          <small>{t("home.verisHint")}</small>
        </Link>
      </div>
    </div>
  );
}
