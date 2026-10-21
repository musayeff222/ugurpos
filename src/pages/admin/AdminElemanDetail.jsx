import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import Modal from "../../components/ui/Modal";
import { formatDateTime, formatMoney } from "../../utils/format";
import "../../styles/eleman.css";

export default function AdminElemanDetail() {
  const { id } = useParams();
  const [person, setPerson] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getElemanPerson(id).then(setPerson).catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="admin-page erp-page">
        <div className="alert alert-danger">{error}</div>
        <Link to="/admin/eleman/list">Geri</Link>
      </div>
    );
  }

  if (!person) return <div className="admin-page erp-page">Yüklənir...</div>;

  return (
    <div className="admin-page erp-page">
      <div className="crm-listbar">
        <div>
          <h2>{person.name}</h2>
          <span>
            {person.login}
            {person.phone ? ` · ${person.phone}` : ""}
            {person.blocked ? " · bloklu" : ""}
          </span>
        </div>
        <Link to="/admin/eleman/list" className="btn btn-default">
          Əlmanlar
        </Link>
      </div>
      <div className="crm-metrics crm-metrics--4">
        <article>
          <span>Kassa</span>
          <strong>{formatMoney(person.balance)}</strong>
        </article>
        <article>
          <span>Alışların cəmi</span>
          <strong>{formatMoney(person.purchaseTotal)}</strong>
        </article>
        <article>
          <span>Verişlərin cəmi</span>
          <strong>{formatMoney(person.deliveryTotal)}</strong>
        </article>
        <article>
          <span>Anbar</span>
          <strong>{person.stock?.length || 0}</strong>
        </article>
      </div>

      <div className="erp-split">
        <section className="erp-panel">
          <header className="erp-panel__head">
            <h3>Alışlar</h3>
          </header>
          {(person.purchases || []).map((row) => (
            <button key={row.id} type="button" className="el-history" style={{ display: "block", marginBottom: 8 }} onClick={() => setInvoice(row)}>
              <span>{formatDateTime(row.createdAt)}</span>
              <b> {formatMoney(row.total)}</b>
            </button>
          ))}
          {!person.purchases?.length && <p className="hint-text">Alış yoxdur.</p>}
        </section>
        <section className="erp-panel">
          <header className="erp-panel__head">
            <h3>Verişlər</h3>
          </header>
          {(person.deliveries || []).map((row) => (
            <button key={row.id} type="button" className="el-history" style={{ display: "block", marginBottom: 8 }} onClick={() => setDelivery(row)}>
              <span>
                {row.branchName} · {row.status === "accepted" ? "Qəbul" : "Gözləyir"}
              </span>
              <b> {formatMoney(row.total)}</b>
            </button>
          ))}
          {!person.deliveries?.length && <p className="hint-text">Veriş yoxdur.</p>}
        </section>
      </div>

      <Modal open={Boolean(invoice)} title="Alış fakturası" onClose={() => setInvoice(null)}>
        {invoice && (
          <div>
            <p>
              {formatDateTime(invoice.createdAt)} · {formatMoney(invoice.total)}
            </p>
            <ul>
              {(invoice.lines || []).map((line, index) => (
                <li key={`${line.productId}-${index}`}>
                  {line.qty} {line.unit} {line.name}
                </li>
              ))}
            </ul>
            {invoice.invoiceUrl ? (
              <p>
                <a href={invoice.invoiceUrl} target="_blank" rel="noreferrer">
                  Faktura şəkli
                </a>
              </p>
            ) : null}
          </div>
        )}
      </Modal>

      <Modal open={Boolean(delivery)} title={delivery?.branchName || "Veriş"} onClose={() => setDelivery(null)}>
        {delivery && (
          <div>
            <p>
              {formatDateTime(delivery.createdAt)} · {formatMoney(delivery.total)}
            </p>
            <ul>
              {(delivery.lines || []).map((line, index) => (
                <li key={`${line.productId}-${index}`}>
                  {line.qty} {line.unit} {line.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
}
