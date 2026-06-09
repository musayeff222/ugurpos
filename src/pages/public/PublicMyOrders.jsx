import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import StitchIcon from "../../components/public/StitchIcon";
import { useLocale } from "../../context/LocaleContext";
import { formatMoney } from "../../utils/format";
import { fetchMyPublicOrders, fetchPublicFirmMenu, fetchPublicOrder } from "../../utils/qrMenuPublic";
import {
  loadMyOrders,
  syncOrdersFromServer,
  updateStoredOrderStatus,
} from "../../utils/qrMenuStorage";
import "../../styles/public-qr-menu.css";

const STATUS_ICON = {
  pending: "schedule",
  accepted: "check_circle",
  rejected: "cancel",
  completed: "task_alt",
};

export default function PublicMyOrders() {
  const { t, lang } = useLocale();
  const [orders, setOrders] = useState([]);
  const [details, setDetails] = useState({});
  const [firm, setFirm] = useState(null);

  useEffect(() => {
    fetchPublicFirmMenu().then((data) => setFirm(data.firm)).catch(() => {});
  }, []);

  const refresh = async () => {
    try {
      const serverOrders = await fetchMyPublicOrders();
      const merged = syncOrdersFromServer(serverOrders);
      setOrders(merged.length ? merged : loadMyOrders());
    } catch {
      setOrders(loadMyOrders());
    }

    const list = loadMyOrders();
    const nextDetails = {};
    await Promise.all(
      list.slice(0, 15).map(async (item) => {
        try {
          const full = await fetchPublicOrder(item.id);
          nextDetails[item.id] = full;
          updateStoredOrderStatus(item.id, full.status);
        } catch {
          nextDetails[item.id] = item;
        }
      })
    );
    setDetails(nextDetails);
    setOrders(loadMyOrders());
  };

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, []);

  const statusLabel = (status) => t(`qr.status.${status}`) || status;
  const money = (v) => formatMoney(v, lang);

  return (
    <PublicQrShell firm={firm} navActive="orders">
      <div className="sf-container">
        <div className="sf-page-head">
          <h2>{t("qr.nav.orders")}</h2>
          <p>{t("qr.ordersPageHint")}</p>
        </div>

        <div className="sf-order-grid">
          {orders.length === 0 ? (
            <div className="sf-panel sf-empty">
              <p>{t("qr.myOrdersEmpty")}</p>
              <Link to="/m" className="sf-btn-outline">
                {t("qr.nav.home")}
              </Link>
            </div>
          ) : (
            orders.map((item) => {
              const full = details[item.id] || item;
              const status = full.status || "pending";
              return (
                <Link key={item.id} to={`/m/order/${item.id}`} className={`sf-order-card status-${status}`}>
                  <div className="sf-order-card__head">
                    <strong>{full.code || item.code}</strong>
                    <span className={`sf-order-badge ${status}`}>
                      <StitchIcon name={STATUS_ICON[status] || "info"} />
                      {statusLabel(status)}
                    </span>
                  </div>
                  <p>
                    #{full.branchNo || ""} {full.branchName || ""}
                  </p>
                  <strong className="sf-order-card__total">{money(full.total)}</strong>
                  <small>{new Date(full.createdAt).toLocaleString(lang === "az" ? "az-AZ" : "tr-TR")}</small>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </PublicQrShell>
  );
}
