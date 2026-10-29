import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { elT } from "../../i18n/eleman";
import { formatDateTime, formatMoney } from "../../utils/format";
import ElemanInvoiceScreen from "./ElemanInvoiceScreen";

export default function ElemanAlisTarixce() {
  const { user } = useAuth();
  const { lang } = useLocale();
  const t = (key) => elT(lang, key);
  const [data, setData] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.staffName || "";

  useEffect(() => {
    api.getElemanOverview().then(setData).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="el-page">
      <div className="el-pagehead">
        <div>
          <h2>{t("alis.history")}</h2>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <section className="el-history">
        {(data?.purchases || []).map((row) => (
          <button key={row.id} type="button" onClick={() => setInvoice(row)}>
            <span>{formatDateTime(row.createdAt, lang)}</span>
            <b>{formatMoney(row.total)}</b>
          </button>
        ))}
        {!data?.purchases?.length && <p>{t("alis.empty")}</p>}
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
