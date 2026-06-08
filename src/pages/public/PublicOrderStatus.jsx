import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import QrMenuHeader from "../../components/public/QrMenuHeader";
import { useLocale } from "../../context/LocaleContext";
import { formatMoney } from "../../utils/format";
import { fetchPublicOrder } from "../../utils/qrMenuPublic";
import { rememberOrder } from "../../utils/qrMenuStorage";
import "../../styles/public-qr-menu.css";

export default function PublicOrderStatus() {
  const { orderId } = useParams();
  const { t, lang } = useLocale();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

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
  const statusText = order ? t(`qr.status.${order.status}`) || order.status : "";

  if (error && !order) {
    return (
      <PublicQrShell>
        <div className="public-menu-error card">{error}</div>
      </PublicQrShell>
    );
  }

  if (!order) {
    return (
      <PublicQrShell>
        <div className="public-menu-loading">{t("qr.loadingOrder")}</div>
      </PublicQrShell>
    );
  }

  return (
    <PublicQrShell>
      <QrMenuHeader firm={{ menuTitle: t("qr.orderReceived") }} />
      <div className="card public-order-status">
        <div className="public-order-status__icon">
          <i className="fa fa-check-circle" />
        </div>
        <h1>{t("qr.orderReceived")}</h1>
        <p className="public-order-status__code">{order.code}</p>
        <p className="public-order-status__state">{statusText}</p>
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
    </PublicQrShell>
  );
}
