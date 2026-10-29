import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";

function formatQty(qty, unit) {
  const n = Number(qty) || 0;
  const label = unit === "kq" ? "kq" : "ədəd";
  if (n <= 0) return `0 ${label}`;
  if (unit === "kq") return `${n} ${label}`;
  return `${Number.isInteger(n) ? n : Math.round(n * 1000) / 1000} ${label}`;
}

export default function AdminElemanStock() {
  const { id } = useParams();
  const [person, setPerson] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getElemanPerson(id).then(setPerson).catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="admin-page erp-page">
        <div className="alert alert-danger">{error}</div>
        <Link to="/admin/eleman/list" className="btn btn-default btn-sm">
          Əlmanlar
        </Link>
      </div>
    );
  }

  if (!person) return <div className="admin-page erp-page">Yüklənir...</div>;

  const rows = person.warehouse || person.stock || [];

  return (
    <div className="admin-page erp-page">
      <div className="crm-listbar">
        <div>
          <h2>Anbar · {person.name}</h2>
          <span>
            {person.login}
            {person.phone ? ` · ${person.phone}` : ""}
          </span>
        </div>
        <Link to="/admin/eleman/list" className="btn btn-default btn-sm">
          Əlmanlar
        </Link>
      </div>

      <section className="erp-panel erp-panel--flush">
        <div className="admin-table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Məhsul</th>
                <th>Miqdar</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const qty = Number(row.qty ?? row.remaining ?? 0);
                const varDir = qty > 0.0001;
                return (
                  <tr key={row.productId || row.name}>
                    <td data-label="Məhsul">
                      <strong>{row.name}</strong>
                      <small>{row.unit === "kq" ? "kq" : "ədəd"}</small>
                    </td>
                    <td data-label="Miqdar">{formatQty(qty, row.unit)}</td>
                    <td data-label="Durum">
                      <span className={`admin-badge ${varDir ? "ok" : "off"}`}>{varDir ? "Var" : "Yox"}</span>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={3} className="erp-table__empty">
                    Anbar boşdur.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
