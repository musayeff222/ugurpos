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

  const money = (v) => formatPublicMoney(v);
  const statusText = order ? t(`qr.status.${order.status}`) || order.status : "";

  if (error && !order) {
    return (
      <PublicQrShell firm={firm}>
        <div className="container py-5 text-center">
          <p className="text-danger">{error}</p>
          <Link to="/m" className="btn_box_green btn_box">{t("qr.nav.home")}</Link>
        </div>
      </PublicQrShell>
    );
  }

  if (!order) {
    return (
      <PublicQrShell firm={firm}>
        <div className="container py-5 text-center">{t("qr.loadingOrder")}</div>
      </PublicQrShell>
    );
  }

  return (
    <PublicQrShell firm={firm || { menuTitle: order.firmName }}>
      <div className="container my-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8">
            <div className="p-4" style={{ background: "#f8f8f8", borderRadius: 12 }}>
              <p className="txt_green title18">{statusText}</p>
              <h2 className="title32 txt_green">{t("qr.orderReceived")}</h2>
              <p className="price">
                <b>{order.code}</b>
              </p>
              <p>{t("qr.orderReceivedHint")}</p>
              <hr />
              <p>
                {t("qr.branch")}: <strong>{getBranchLabel({ name: order.branchName })}</strong>
              </p>
              {order.deliveryAddress && (
                <p>
                  {t("qr.orderDeliveryAddress")}: <strong>{order.deliveryAddress}</strong>
                </p>
              )}
              <ul>
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.qty}x {item.name} — {money(item.qty * item.price)}
                  </li>
                ))}
              </ul>
              <div className="d-flex justify-content-between">
                <span>{t("common.total")}</span>
                <strong className="price">{money(order.total)}</strong>
              </div>
              <div className="mt-4">
                <button type="button" className="btn_box_green btn_box mr-2" onClick={() => navigate(`/m/branch/${order.branchId}`)}>
                  {t("qr.nav.menu")}
                </button>
                <Link to="/m" className="btn_box_line">
                  {t("qr.nav.home")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicQrShell>
  );
}
