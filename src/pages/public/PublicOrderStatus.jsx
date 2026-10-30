import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import { useLocale } from "../../context/LocaleContext";
import { formatPublicMoney } from "../../utils/publicMoney";
import { fetchPublicFirmMenu, fetchPublicOrder } from "../../utils/qrMenuPublic";
import { rememberOrder } from "../../utils/qrMenuStorage";
import { getBranchLabel } from "../../utils/branchDisplay";

export default function PublicOrderStatus() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { t } = useLocale();
  const [order, setOrder] = useState(null);
  const [firm, setFirm] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPublicFirmMenu()
      .then((data) => setFirm(data.firm))
      .catch(() => {});
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

  const money = (v) => formatPublicMoney(v);
  const statusText = order ? t(`qr.status.${order.status}`) || order.status : "";

  if (error && !order) {
    return (
      <PublicQrShell firm={firm}>
        <div className="ps-empty">
          <p>{error}</p>
          <Link to="/m" className="ps-btn">
            {t("qr.nav.home")}
          </Link>
        </div>
      </PublicQrShell>
    );
  }

  if (!order) {
    return (
      <PublicQrShell firm={firm}>
        <div className="ps-loading">{t("qr.loadingOrder")}</div>
      </PublicQrShell>
    );
  }

  return (
    <PublicQrShell firm={firm || { menuTitle: order.firmName }}>
      <div className="ps-panel">
        <p className="ps-kicker" style={{ color: "#c9a227" }}>
          {statusText}
        </p>
        <h2>{t("qr.orderReceived")}</h2>
        <p className="ps-price">
          <b>{order.code}</b>
        </p>
        <p>{t("qr.orderReceivedHint")}</p>
        <p>
          {t("qr.branch")}: <strong>{getBranchLabel({ name: order.branchName })}</strong>
        </p>
        {order.deliveryAddress ? (
          <p>
            {t("qr.orderDeliveryAddress")}: <strong>{order.deliveryAddress}</strong>
          </p>
        ) : null}
        <ul>
          {order.items.map((item) => (
            <li key={item.id}>
              {item.qty}x {item.name} — {money(item.qty * item.price)}
            </li>
          ))}
        </ul>
        <div className="ps-total">
          <span>{t("common.total")}</span>
          <strong>{money(order.total)}</strong>
        </div>
        <div className="ps-hero__actions" style={{ marginTop: 20 }}>
          <button type="button" className="ps-btn" onClick={() => navigate(`/m/branch/${order.branchId}`)}>
            {t("qr.nav.menu")}
          </button>
          <Link to="/m" className="ps-btn-ghost">
            {t("qr.nav.home")}
          </Link>
        </div>
      </div>
    </PublicQrShell>
  );
}
