import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import { useLocale } from "../../context/LocaleContext";
import { formatMoney } from "../../utils/format";
import { fetchPublicFirmMenu, fetchPublicOrder } from "../../utils/qrMenuPublic";
import { rememberOrder } from "../../utils/qrMenuStorage";
import "../../styles/public-qr-menu.css";

const STATUS_META = {
  pending: { icon: "fa-clock-o", className: "pending" },
  accepted: { icon: "fa-check", className: "accepted" },
  rejected: { icon: "fa-times", className: "rejected" },
  completed: { icon: "fa-check-circle", className: "completed" },
};

export default function PublicOrderStatus() {
  const { orderId } = useParams();
  const { t, lang } = useLocale();
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

  const money = (value) => formatMoney(value, lang);
  const status = order?.status || "pending";
  const statusText = order ? t(`qr.status.${order.status}`) || order.status : "";
  const meta = STATUS_META[status] || STATUS_META.pending;

  if (error && !order) {
    return (
      <PublicQrShell firm={firm} navActive="orders">
        <div className="public-web-container">
          <div className="public-menu-error card">{error}</div>
        </div>
      </PublicQrShell>
    );
  }

  if (!order) {
    return (
      <PublicQrShell firm={firm} navActive="orders">
        <div className="public-web-container">
          <div className="public-menu-loading">{t("qr.loadingOrder")}</div>
        </div>
      </PublicQrShell>
    );
  }

  const shellFirm = firm || (order.firmName ? { menuTitle: order.firmName } : undefined);

  return (
    <PublicQrShell firm={shellFirm} branchId={order.branchId} navActive="orders">
      <div className="public-web-container">
        <div className="card public-order-status">
          <div className={`public-order-status__badge qr-order-badge ${meta.className}`}>
            <i className={`fa ${meta.icon}`} />
            {statusText}
          </div>
          <h1>{t("qr.orderReceived")}</h1>
          <p className="public-order-status__code">{order.code}</p>
          {order.firmName && (
            <p className="public-menu-branch-tag">
              {t("qr.firm")}: <strong>{order.firmName}</strong>
            </p>
          )}
          <p className="public-menu-branch-tag">
            {t("qr.branch")}: <strong>#{order.branchNo} {order.branchName}</strong>
          </p>
          {(order.deliveryAddress || order.tableNo) && (
            <p className="public-menu-branch-tag">
              {t("qr.orderDeliveryAddress")}: <strong>{order.deliveryAddress || order.tableNo}</strong>
            </p>
          )}
          {order.customerPhone && (
            <p className="public-menu-branch-tag">
              {t("qr.phone")}: <strong>{order.customerPhone}</strong>
            </p>
          )}
          <ul className="public-order-status__items">
            {order.items.map((item) => (
              <li key={item.id}>
                {item.qty}x {item.name} — {money(item.qty * item.price)}
              </li>
            ))}
          </ul>
          <div className="public-order-status__total">
            <span>{t("common.total")}</span>
            <strong>{money(order.total)}</strong>
          </div>
        </div>
      </div>
    </PublicQrShell>
  );
}
