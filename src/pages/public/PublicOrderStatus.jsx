import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { formatMoney } from "../../utils/format";
import { fetchPublicOrder } from "../../utils/qrMenuPublic";
import "../../styles/public-qr-menu.css";

const STATUS_LABELS = {
  pending: "Siparişiniz alındı, onay bekleniyor",
  accepted: "Siparişiniz onaylandı, hazırlanıyor",
  rejected: "Sipariş reddedildi",
  completed: "Sipariş tamamlandı",
};

export default function PublicOrderStatus() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    fetchPublicOrder(orderId)
      .then(setOrder)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [orderId]);

  if (error && !order) {
    return (
      <div className="public-menu-page">
        <div className="public-menu-error card">{error}</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="public-menu-page">
        <div className="public-menu-loading">Sipariş yükleniyor…</div>
      </div>
    );
  }

  return (
    <div className="public-menu-page">
      <div className="card public-order-status">
        <div className="public-order-status__icon">
          <i className="fa fa-check-circle" />
        </div>
        <h1>Sipariş Alındı</h1>
        <p className="public-order-status__code">{order.code}</p>
        <p className="public-order-status__state">{STATUS_LABELS[order.status] || order.status}</p>
        {order.firmName && (
          <p className="public-menu-branch-tag">
            Firma: <strong>{order.firmName}</strong>
          </p>
        )}
        <p className="public-menu-branch-tag">
          Şube: <strong>#{order.branchNo} {order.branchName}</strong>
        </p>
        <ul className="public-order-status__items">
          {order.items.map((item) => (
            <li key={item.id}>
              {item.qty}x {item.name} — {formatMoney(item.qty * item.price)}
            </li>
          ))}
        </ul>
        <div className="public-order-status__total">
          <span>Toplam</span>
          <strong>{formatMoney(order.total)}</strong>
        </div>
      </div>
    </div>
  );
}
