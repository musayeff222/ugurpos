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
        <div className="crm-listbar__tools">
          <Link to={`/admin/eleman/${person.id}/stok`} className="btn btn-primary btn-sm">
            Anbar
          </Link>
          <Link to="/admin/eleman/list" className="btn btn-default btn-sm">
            Əlmanlar
          </Link>
        </div>
      </div>
      <div className="crm-metrics crm-metrics--4">
        <article>
          <span>Əsas kassa</span>
          <strong>{formatMoney(person.balance)}</strong>
        </article>
        <article>
          <span>Franchise kassası</span>
          <strong>{formatMoney(person.franchiseBalance)}</strong>
        </article>
        <article>
          <span>Alışların cəmi</span>
          <strong>{formatMoney(person.purchaseTotal)}</strong>
        </article>
        <article>
          <span>Anbar</span>
          <strong>{person.stock?.length || 0}</strong>
          <small>
            <Link to={`/admin/eleman/${person.id}/stok`}>Aç</Link>
          </small>
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
          {(person.deliveries || [])
            .filter((row) => row.channel !== "franchise")
            .map((row) => (
            <button key={row.id} type="button" className="el-history" style={{ display: "block", marginBottom: 8 }} onClick={() => setDelivery(row)}>
              <span>
                {row.branchName} · {row.status === "accepted" ? "Qəbul" : "Gözləyir"}
              </span>
              <b> {formatMoney(row.total)}</b>
            </button>
          ))}
          {!person.deliveries?.filter((row) => row.channel !== "franchise").length && <p className="hint-text">Veriş yoxdur.</p>}
        </section>
      </div>

      <section className="erp-panel" style={{ marginTop: 16 }}>
        <header className="erp-panel__head">
          <h3>Franchise verilənlər</h3>
          <span>Kassa {formatMoney(person.franchiseBalance)}</span>
        </header>
        {(person.franchiseDeliveries || person.deliveries || [])
          .filter((row) => row.channel === "franchise")
          .map((row) => (
            <button key={row.id} type="button" className="el-history" style={{ display: "block", marginBottom: 8 }} onClick={() => setDelivery(row)}>
              <span>
                {row.branchName} ·{" "}
                {row.payType === "debt"
                  ? "Borç"
                  : row.payType === "split"
                    ? `Yarı-yarı · ${formatMoney(row.paidAmount || 0)} + ${formatMoney(row.debtAmount || 0)}`
                    : "Nakit"}
              </span>
              <b> {formatMoney(row.total)}</b>
            </button>
          ))}
        {!(person.franchiseDeliveries || person.deliveries || []).filter((row) => row.channel === "franchise").length && (
          <p className="hint-text">Franchise verişi yoxdur.</p>
        )}
      </section>

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
              {delivery.channel === "franchise"
                ? ` · ${
                    delivery.payType === "debt"
                      ? "Borç"
                      : delivery.payType === "split"
                        ? `Yarı-yarı · ${formatMoney(delivery.paidAmount || 0)} + ${formatMoney(delivery.debtAmount || 0)}`
                        : "Nakit"
                  }`
                : ""}
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
