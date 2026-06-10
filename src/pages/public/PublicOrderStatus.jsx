import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import { useLocale } from "../../context/LocaleContext";
import { formatPublicMoney } from "../../utils/publicMoney";
import { fetchPublicFirmMenu, fetchPublicOrder } from "../../utils/qrMenuPublic";
import { rememberOrder } from "../../utils/qrMenuStorage";

const STATUS_ICON = {
  pending: "fa-clock-o",
  accepted: "fa-check-circle",
  rejected: "fa-times-circle",
  completed: "fa-check",
};

export default function PublicOrderStatus() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { t } = useLocale();
  const [order, setOrder] = useState(null);
  const [firm, setFirm] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPublicFirmMenu().then((data) => setFirm(data.firm)).catch(() => {});
  }, []);

  const load = () => {
    fetchPublicOrder(orderId)
      .then((data) => {
        setOrder(data);
        rememberOrder(data);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [orderId]);

  const money = (value) => formatPublicMoney(value);
  const status = order?.status || "pending";
  const statusText = order ? t(`qr.status.${order.status}`) || order.status : "";

  if (error && !order) {
    return (
      <PublicQrShell firm={firm} navActive="home">
        <div className="oses-container">
          <div className="oses-alert">{error}</div>
          <Link to="/m" className="oses-btn oses-btn--outline-dark">
            {t("qr.nav.home")}
          </Link>
        </div>
      </PublicQrShell>
    );
  }

  if (!order) {
    return (
      <PublicQrShell firm={firm} navActive="home">
        <div className="oses-container">
          <div className="oses-loading">{t("qr.loadingOrder")}</div>
        </div>
      </PublicQrShell>
    );
  }

  const shellFirm = firm || (order.firmName ? { menuTitle: order.firmName } : undefined);

  return (
    <PublicQrShell firm={shellFirm} branchId={order.branchId} navActive="home">
      <section className="oses-section">
        <div className="oses-container">
          <div className="oses-panel oses-order-status">
            <div className={`oses-status-badge oses-status-badge--${status}`}>
              <i className={`fa ${STATUS_ICON[status] || STATUS_ICON.pending}`} />
              {statusText}
            </div>
            <h1>{t("qr.orderReceived")}</h1>
            <p className="oses-order-code">{order.code}</p>
            <p className="oses-order-hint">{t("qr.orderReceivedHint")}</p>
            <p className="oses-meta">
              {t("qr.branch")}: <strong>#{order.branchNo} {order.branchName}</strong>
            </p>
            {(order.deliveryAddress || order.tableNo) && (
              <p className="oses-meta">
                {t("qr.orderDeliveryAddress")}: <strong>{order.deliveryAddress || order.tableNo}</strong>
              </p>
            )}
            {order.customerPhone && (
              <p className="oses-meta">
                {t("qr.phone")}: <strong>{order.customerPhone}</strong>
              </p>
            )}
            <ul className="oses-order-items">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.qty}x {item.name} — {money(item.qty * item.price)}
                </li>
              ))}
            </ul>
            <div className="oses-summary__row">
              <span>{t("common.total")}</span>
              <strong>{money(order.total)}</strong>
            </div>
            <div className="oses-order-actions">
              <button type="button" className="oses-btn oses-btn--primary" onClick={() => navigate(`/m/branch/${order.branchId}`)}>
                {t("qr.nav.menu")}
              </button>
              <Link to="/m" className="oses-btn oses-btn--outline-dark">
                {t("qr.nav.home")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicQrShell>
  );
}
