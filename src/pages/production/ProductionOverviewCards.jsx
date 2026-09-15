import { Link } from "react-router-dom";
import { formatDateTime } from "../../utils/format";

export default function ProductionOverviewCards({ summary }) {
  const low = summary?.lowStock || [];
  const critical = summary?.criticalStock || [];
  const recentUsage = summary?.recentUsage || [];
  const recentBatches = summary?.recentBatches || [];

  return (
    <div className="prod-dash-grid">
      <section className="prod-card">
        <header>
          <h3>
            <i className="fa fa-clock-o" aria-hidden /> Son istifadə olunan xammallar
          </h3>
          <Link to="/istehsalat/istifade">İstifadə</Link>
        </header>
        {recentUsage.length ? (
          <ul>
            {recentUsage.map((row) => (
              <li key={row.id}>
                <strong>{row.materialName || "Xammal"}</strong>
                <span>
                  −{row.qty} {row.unit}
                  {row.productName ? ` · ${row.productName}` : ""}
                </span>
                <small>{row.createdAt ? formatDateTime(row.createdAt, "az") : ""}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="prod-empty">Hələ istifadə yoxdur.</p>
        )}
      </section>
      <section className="prod-card">
        <header>
          <h3>
            <i className="fa fa-exclamation-triangle" aria-hidden /> Aşağı stok xəbərdarlıqları
          </h3>
        </header>
        {low.length ? (
          <ul>
            {low.map((row) => (
              <li key={row.id}>
                <strong>{row.name}</strong>
                <span>
                  {row.stock} {row.unit}
                </span>
                <small>limit: {row.criticalStock}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="prod-empty">Aşağı stok yoxdur.</p>
        )}
      </section>
      <section className="prod-card prod-card--warn">
        <header>
          <h3>
            <i className="fa fa-warning" aria-hidden /> Kritik stoklar
          </h3>
        </header>
        {critical.length ? (
          <ul>
            {critical.map((row) => (
              <li key={row.id}>
                <strong>{row.name}</strong>
                <span>
                  {row.stock} {row.unit}
                </span>
                <small>stok bitib</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="prod-empty">Kritik stok yoxdur.</p>
        )}
      </section>
      <section className="prod-card">
        <header>
          <h3>
            <i className="fa fa-archive" aria-hidden /> Son hazırlanan məhsullar
          </h3>
          <Link to="/istehsalat/mehsullar">Hamısı</Link>
        </header>
        {recentBatches.length ? (
          <ul>
            {recentBatches.map((row) => (
              <li key={row.id}>
                <strong>{row.productName}</strong>
                <span>{(row.items || []).length} xammal</span>
                <small>{row.createdAt ? formatDateTime(row.createdAt, "az") : ""}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="prod-empty">Hələ hazırlanan məhsul yoxdur.</p>
        )}
      </section>
    </div>
  );
}
