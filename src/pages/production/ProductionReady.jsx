import { useEffect, useState } from "react";
import { api } from "../../api/client";

export default function ProductionReady() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    setRows(await api.getProductionReady());
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  return (
    <div className="prod-page">
      <div className="prod-hero">
        <div>
          <p className="prod-kicker">Anbar</p>
          <h1>İstifadəyə hazır</h1>
          <span>Hazır olan məhsullar qramla burada saxlanır</span>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="prod-product-grid">
        {rows.map((item) => (
          <article key={item.id} className="prod-product-card prod-product-card--ready">
            <h3>
              <em>{item.readyStock} qram</em> {item.name}
            </h3>
          </article>
        ))}
        {!rows.length && <p className="prod-empty">İstifadəyə hazır məhsul yoxdur. “Hazırlanan məhsullar”dan Hazır basın.</p>}
      </div>
    </div>
  );
}
