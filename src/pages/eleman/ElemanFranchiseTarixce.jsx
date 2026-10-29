import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useLocale } from "../../context/LocaleContext";
import { elT } from "../../i18n/eleman";
import { formatDateTime, formatMoney } from "../../utils/format";

function payLabel(row, t) {
  if (row.payType === "debt") return t("franchise.debt");
  if (row.payType === "split") {
    return `${t("franchise.split")} · ${formatMoney(row.paidAmount || 0)} + ${formatMoney(row.debtAmount || 0)}`;
  }
  return t("franchise.cash");
}

export default function ElemanFranchiseTarixce() {
  const { lang } = useLocale();
  const t = (key) => elT(lang, key);
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getElemanOverview().then(setData).catch((err) => setError(err.message));
  }, []);

  const rows = data?.franchiseDeliveries || [];

  return (
    <div className="el-page">
      <div className="el-pagehead">
        <div>
          <h2>{t("franchise.history")}</h2>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <section className="el-history">
        {rows.map((row) => (
          <button key={row.id} type="button" onClick={() => setDetail(row)}>
            <span>
              {row.branchName} · {payLabel(row, t)} ·{" "}
              {formatDateTime(row.createdAt, lang)}
            </span>
            <b>{formatMoney(row.total)}</b>
          </button>
        ))}
        {!rows.length && <p>{t("franchise.historyEmpty")}</p>}
      </section>
      {detail ? (
        <div className="el-full">
          <header className="el-full__bar">
            <button type="button" className="el-full__back" onClick={() => setDetail(null)}>
              {t("menu.back")}
            </button>
            <h2>{detail.branchName || t("menu.franchise")}</h2>
          </header>
          <div className="el-full__body">
            <article className="el-invoice">
              <p>
                {formatDateTime(detail.createdAt, lang)} · {formatMoney(detail.total)}
              </p>
              <p>{payLabel(detail, t)}</p>
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
