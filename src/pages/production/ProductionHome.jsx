import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import ProductionOverviewCards from "./ProductionOverviewCards";

export default function ProductionHome() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getProductionSummary()
      .then(setSummary)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="prod-page">
      <div className="prod-hero">
        <div>
          <p className="prod-kicker">Ləvazimatlar</p>
          <h1>Ana səhifə</h1>
          <span>Stok, istifadə və hazır məhsul icmalı</span>
        </div>
        <Link to="/istehsalat/xammaddeler" className="prod-btn prod-btn--primary">
          + Yeni xammaddə əlavə et
        </Link>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {summary && (
        <>
          <div className="prod-kpis">
            <article>
              <span>Xammaddələr</span>
              <strong>{summary.materialCount}</strong>
            </article>
            <article>
              <span>Hazırlanan məhsullar</span>
              <strong>{summary.productCount}</strong>
            </article>
            <article>
              <span>İstifadə qeydi</span>
              <strong>{summary.batchCount}</strong>
            </article>
            <article>
              <span>Kritik stok</span>
              <strong>{summary.criticalStock?.length || 0}</strong>
            </article>
          </div>
          <ProductionOverviewCards summary={summary} />
        </>
      )}
    </div>
  );
}
