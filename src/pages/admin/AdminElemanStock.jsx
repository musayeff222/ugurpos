import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { formatMoney } from "../../utils/format";

function formatQty(qty, unit) {
  const n = Number(qty) || 0;
  const label = unit === "kq" ? "kq" : "ədəd";
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

  const rows = useMemo(() => {
    if (person?.stockBoard?.length) return person.stockBoard;
    return (person?.stock || []).map((item) => ({
      productId: item.productId,
      name: item.name,
      unit: item.unit,
      boughtQty: item.qty,
      givenQty: 0,
      remaining: item.qty,
      unitCost: item.unitCost,
      status: Number(item.qty) > 0 ? "var" : "yok",
    }));
  }, [person]);

  const inStock = rows.filter((row) => row.status === "var").length;

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

  return (
    <div className="admin-page erp-page">
      <div className="crm-listbar">
        <div>
          <h2>Stok · {person.name}</h2>
          <span>
            {person.login}
            {person.phone ? ` · ${person.phone}` : ""}
          </span>
        </div>
        <div className="crm-listbar__tools">
          <Link to={`/admin/eleman/${person.id}`} className="btn btn-default btn-sm">
            Əməliyyatlar
          </Link>
          <Link to="/admin/eleman/list" className="btn btn-default btn-sm">
            Əlmanlar
          </Link>
        </div>
      </div>

      <div className="crm-metrics crm-metrics--4">
        <article>
          <span>Məhsul</span>
          <strong>{rows.length}</strong>
          <small>alışda görünən</small>
        </article>
        <article>
          <span>Var</span>
          <strong>{inStock}</strong>
          <small>əlində qalan</small>
        </article>
        <article>
          <span>Yox</span>
          <strong>{rows.length - inStock}</strong>
          <small>bitmiş</small>
        </article>
        <article>
          <span>Əsas kassa</span>
          <strong>{formatMoney(person.balance)}</strong>
          <small>cari</small>
        </article>
      </div>

      <section className="erp-panel erp-panel--flush">
        <div className="admin-table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Məhsul</th>
                <th>Alınan</th>
                <th>Verilən</th>
                <th>Qalan</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.productId}>
                  <td data-label="Məhsul">
                    <strong>{row.name}</strong>
                    <small>{row.unit}</small>
                  </td>
                  <td data-label="Alınan">{formatQty(row.boughtQty, row.unit)}</td>
                  <td data-label="Verilən">{formatQty(row.givenQty, row.unit)}</td>
                  <td data-label="Qalan">
                    <strong>{formatQty(row.remaining, row.unit)}</strong>
                    {row.unitCost ? <small>{formatMoney(row.unitCost)}</small> : null}
                  </td>
                  <td data-label="Durum">
                    <span className={`admin-badge ${row.status === "var" ? "ok" : "off"}`}>
                      {row.status === "var" ? "Var" : "Yox"}
                    </span>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="erp-table__empty">
                    Bu əlman hələ məhsul almayıb. Stok boşdur.
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
