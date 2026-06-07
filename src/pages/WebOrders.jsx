import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import { formatMoney } from "../utils/format";
import { useAuth } from "../context/AuthContext";
import { useWebOrders } from "../context/WebOrdersContext";
import { useLocale } from "../context/LocaleContext";
import "../styles/qr-orders.css";

const STATUS_LABELS = {
  pending: "Bekliyor",
  accepted: "Onaylandı",
  rejected: "Reddedildi",
  completed: "Tamamlandı",
};

const POLL_MS = 5000;

export default function WebOrders() {
  const { activeBranchName } = useAuth();
  const { t, lang } = useLocale();
  const { refresh: refreshPending, clearLatest } = useWebOrders();
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [newFlash, setNewFlash] = useState("");
  const prevIdsRef = useRef(new Set());

  const loadOrders = useCallback(async () => {
    const data = await api.getQrOrders({ status: status || "all" });
    if (status === "pending") {
      const fresh = data.filter((o) => !prevIdsRef.current.has(o.id));
      if (prevIdsRef.current.size > 0 && fresh.length > 0) {
        setNewFlash(t("webOrders.newFlash", { count: fresh.length }));
        setTimeout(() => setNewFlash(""), 5000);
      }
      prevIdsRef.current = new Set(data.map((o) => o.id));
    }
    setOrders(data);
    await refreshPending();
  }, [status, refreshPending]);

  useEffect(() => {
    clearLatest();
    setLoading(true);
    loadOrders()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [loadOrders, clearLatest]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadOrders().catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [loadOrders]);

  const updateOrderStatus = async (id, nextStatus) => {
    setMessage("");
    setError("");
    try {
      await api.updateQrOrder(id, nextStatus);
      setMessage("Sipariş güncellendi.");
      await loadOrders();
    } catch (e) {
      setError(e.message);
    }
  };

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="qr-orders-page">
      <PageHeader
        title={t("webOrders.title")}
        subtitle={
          activeBranchName
            ? t("webOrders.subtitle", { branch: activeBranchName })
            : t("webOrders.title")
        }
      />

      {newFlash && <div className="alert alert-warning qr-orders-flash">{newFlash}</div>}
      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card qr-orders-toolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pending">Bekleyen</option>
          <option value="accepted">Onaylanan</option>
          <option value="completed">Tamamlanan</option>
          <option value="rejected">Reddedilen</option>
          <option value="all">Tümü</option>
        </select>
        <button type="button" className="btn btn-default btn-sm" onClick={() => loadOrders().catch((e) => setError(e.message))}>
          {t("webOrders.refresh")}
        </button>
        {status === "pending" && pendingCount > 0 && (
          <span className="qr-orders-pending-badge">
            {pendingCount} {t("webOrders.pending")}
          </span>
        )}
      </div>

      {loading ? (
        <p className="hint-text">{t("common.loading")}</p>
      ) : orders.length === 0 ? (
        <div className="card">
          <p className="hint-text">
            {status === "pending" ? t("webOrders.emptyPending") : "—"}
          </p>
        </div>
      ) : (
        <div className="qr-order-list">
          {orders.map((order) => (
            <div key={order.id} className={`qr-order-card status-${order.status}`}>
              <div className="qr-order-card__head">
                <div>
                  <strong>{order.code}</strong>
                  <span className={`qr-order-badge ${order.status}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
                <strong>{formatMoney(order.total, lang)}</strong>
              </div>
              <p>
                {order.customerName}
                {order.customerPhone ? ` · ${order.customerPhone}` : ""}
                {order.tableNo ? ` · Masa ${order.tableNo}` : ""}
              </p>
              {order.note && <p className="hint-text">Not: {order.note}</p>}
              <ul className="qr-order-items">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.qty}x {item.name} — {formatMoney(item.qty * item.price, lang)}
                  </li>
                ))}
              </ul>
              <div className="qr-order-actions">
                {order.status === "pending" && (
                  <>
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      onClick={() => updateOrderStatus(order.id, "accepted")}
                    >
                      {t("webOrders.accept")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => updateOrderStatus(order.id, "rejected")}
                    >
                      {t("webOrders.reject")}
                    </button>
                  </>
                )}
                {order.status === "accepted" && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => updateOrderStatus(order.id, "completed")}
                  >
                    {t("webOrders.complete")}
                  </button>
                )}
              </div>
              <small className="qr-order-time">{new Date(order.createdAt).toLocaleString("tr-TR")}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
