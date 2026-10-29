import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useLocale } from "../../context/LocaleContext";
import { elT } from "../../i18n/eleman";
import { formatDateTime, formatMoney } from "../../utils/format";

export default function ElemanVerisTarixce() {
  const { lang } = useLocale();
  const t = (key) => elT(lang, key);
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getElemanOverview().then(setData).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="el-page">
      <div className="el-pagehead">
        <div>
          <h2>{t("veris.history")}</h2>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <section className="el-history">
        {(data?.deliveries || []).filter((row) => row.channel !== "franchise").map((row) => (
          <button key={row.id} type="button" onClick={() => setDetail(row)}>
            <span>
              {row.branchName} · {row.status === "accepted" ? t("veris.accepted") : t("veris.pending")}
            </span>
            <b>{formatMoney(row.total)}</b>
          </button>
        ))}
        {!(data?.deliveries || []).filter((row) => row.channel !== "franchise").length && <p>{t("veris.empty")}</p>}
      </section>
      {detail ? (
        <div className="el-full">
          <header className="el-full__bar">
            <button type="button" className="el-full__back" onClick={() => setDetail(null)}>
              {t("menu.back")}
            </button>
            <h2>{detail.branchName || t("veris.title")}</h2>
          </header>
          <div className="el-full__body">
            <article className="el-invoice">
              <p>
                {formatDateTime(detail.createdAt, lang)} · {formatMoney(detail.total)}
              </p>
              <p>{detail.status === "accepted" ? t("veris.accepted") : t("veris.pending")}</p>
              <ul>
                {(detail.lines || []).map((line, index) => (
                  <li key={`${line.productId}-${index}`}>
                    <span>
                      {line.qty} {line.unit} {line.name}
                    </span>
                    <b>
                      {formatMoney(line.price)} · {formatMoney(Number(line.qty || 0) * Number(line.price || 0))}
                    </b>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      ) : null}
    </div>
  );
}
