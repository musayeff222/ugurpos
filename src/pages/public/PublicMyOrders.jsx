import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import PublicQrBottomNav from "../../components/public/PublicQrBottomNav";
import QrMenuHeader from "../../components/public/QrMenuHeader";
import { useLocale } from "../../context/LocaleContext";
import { formatMoney } from "../../utils/format";
import { fetchPublicOrder } from "../../utils/qrMenuPublic";
import { loadMyOrders, updateStoredOrderStatus } from "../../utils/qrMenuStorage";
import "../../styles/public-qr-menu.css";

export default function PublicMyOrders() {
  const { t, lang } = useLocale();
  const [orders, setOrders] = useState([]);
  const [details, setDetails] = useState({});

  const refresh = async () => {
    const stored = loadMyOrders();
    setOrders(stored);
    const nextDetails = {};
    await Promise.all(
      stored.slice(0, 10).map(async (item) => {
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
    <PublicQrShell>
      <QrMenuHeader firm={{ menuTitle: t("qr.nav.orders") }} />
      <div className="public-web-section public-my-orders">
        {orders.length === 0 ? (
          <div className="card public-menu-empty-card">
            <p>{t("qr.myOrdersEmpty")}</p>
          </div>
        ) : (
          orders.map((item) => {
            const full = details[item.id] || item;
            return (
              <Link key={item.id} to={`/m/order/${item.id}`} className="public-my-order-card card">
                <div className="public-my-order-card__head">
                  <strong>{full.code || item.code}</strong>
                  <span className={`qr-order-badge ${full.status}`}>{statusLabel(full.status)}</span>
                </div>
                <p>
                  #{full.branchNo || ""} {full.branchName || ""}
                </p>
                <strong>{money(full.total)}</strong>
                <small>{new Date(full.createdAt).toLocaleString(lang === "az" ? "az-AZ" : "tr-TR")}</small>
              </Link>
            );
          })
        )}
      </div>
      <PublicQrBottomNav active="orders" />
    </PublicQrShell>
  );
}
