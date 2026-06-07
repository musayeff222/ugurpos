import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import PageHeader from "../../components/ui/PageHeader";
import { formatMoney } from "../../utils/format";
import { getMenuPublicUrl, getQrCodeUrl } from "../../utils/qrMenuPublic";

const STATUS_LABELS = {
  pending: "Bekliyor",
  accepted: "Onaylandı",
  rejected: "Reddedildi",
  completed: "Tamamlandı",
};

const STATUS_CLASS = {
  pending: "pending",
  accepted: "ok",
  rejected: "off",
  completed: "ok",
};

export default function AdminQrMenu() {
  const [tab, setTab] = useState("settings");
  const [firm, setFirm] = useState(null);
  const [branches, setBranches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState({ branchId: "", status: "pending" });
  const [firmDraft, setFirmDraft] = useState({});
  const [branchDrafts, setBranchDrafts] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    const data = await api.getAdminQrMenu();
    setFirm(data.firm);
    setBranches(data.branches);
    setFirmDraft({
      menuEnabled: data.firm.menuEnabled !== false,
      menuTitle: data.firm.menuTitle || "",
      menuWelcome: data.firm.menuWelcome || "",
    });
    setBranchDrafts(
      Object.fromEntries(
        data.branches.map((b) => [
          b.id,
          {
            menuEnabled: b.menuEnabled,
            menuAcceptOrders: b.menuAcceptOrders,
          },
        ])
      )
    );
  };

  const loadOrders = async () => {
    const params = { status: orderFilter.status || "all" };
    if (orderFilter.branchId) params.branchId = orderFilter.branchId;
    setOrders(await api.getAdminQrOrders(params));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadSettings(), loadOrders()])
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "orders") loadOrders().catch((e) => setError(e.message));
  }, [tab, orderFilter]);

  const pendingTotal = useMemo(
    () => branches.reduce((sum, b) => sum + (b.pendingOrders || 0), 0),
    [branches]
  );

  const menuUrl = typeof window !== "undefined" ? getMenuPublicUrl() : "";

  const saveFirmSettings = async () => {
    setMessage("");
    setError("");
    try {
      await api.updateAdminQrMenu(firmDraft);
      await loadSettings();
      setMessage("Menü linki ayarları kaydedildi.");
    } catch (err) {
      setError(err.message);
    }
  };

  const saveBranchSettings = async (branchId) => {
    setMessage("");
    setError("");
    try {
      await api.updateAdminQrMenuBranch(branchId, branchDrafts[branchId]);
      await loadSettings();
      setMessage("Şube menü ayarları kaydedildi.");
    } catch (err) {
      setError(err.message);
    }
  };

  const copyLink = async () => {
    if (!menuUrl) return;
    await navigator.clipboard.writeText(menuUrl);
    setMessage("Tek menü linki kopyalandı.");
  };

  const updateOrderStatus = async (orderId, status) => {
    setError("");
    try {
      await api.updateAdminQrOrder(orderId, status);
      await loadOrders();
      await loadSettings();
      setMessage("Sipariş durumu güncellendi.");
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="card">Yükleniyor...</div>;

  return (
    <div className="admin-page admin-qr-page">
      <PageHeader title="QR Menü" subtitle="Tek link, tüm şubeler" />

      {message && <div className="alert alert-info">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <ul className="admin-tabs">
        <li>
          <button type="button" className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>
            Ayarlar
          </button>
        </li>
        <li>
          <button type="button" className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>
            Siparişler {pendingTotal > 0 && <span className="admin-qr-badge">{pendingTotal}</span>}
          </button>
        </li>
      </ul>

      {tab === "settings" && (
        <>
          <div className="card admin-qr-firm-card">
            <h3>Menü linki</h3>

            {menuUrl && (
              <div className="admin-qr-firm-link">
                {!firm?.menuEnabled && (
                  <div className="alert alert-danger">
                    Menü şu an kapalı. Aşağıdan &quot;QR menü aktif&quot; işaretleyip kaydedin.
                  </div>
                )}
                <img src={getQrCodeUrl(menuUrl)} alt="QR Menü" className="admin-qr-code" />
                <code className="admin-qr-url">{menuUrl}</code>
                <div className="admin-qr-firm-actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={copyLink}>
                    Linki Kopyala
                  </button>
                  <a href={menuUrl} target="_blank" rel="noopener noreferrer" className="btn btn-default btn-sm">
                    Menüyü Aç ↗
                  </a>
                </div>
              </div>
            )}

            <div className="admin-qr-firm-form">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={!!firmDraft.menuEnabled}
                  onChange={(e) => setFirmDraft((prev) => ({ ...prev, menuEnabled: e.target.checked }))}
                />
                QR menü aktif (link çalışsın)
              </label>
              <label>Menü başlığı</label>
              <input
                value={firmDraft.menuTitle || ""}
                onChange={(e) => setFirmDraft((prev) => ({ ...prev, menuTitle: e.target.value }))}
              />
              <label>Karşılama metni</label>
              <textarea
                rows={2}
                value={firmDraft.menuWelcome || ""}
                onChange={(e) => setFirmDraft((prev) => ({ ...prev, menuWelcome: e.target.value }))}
              />
              <button type="button" className="btn btn-success btn-sm" onClick={saveFirmSettings}>
                Genel Ayarları Kaydet
              </button>
            </div>
          </div>

          <h3 className="admin-section-title">Şubeler (menüde görünsün)</h3>
          <div className="admin-qr-settings">
            {branches.map((branch) => {
              const draft = branchDrafts[branch.id] || {};
              return (
                <div key={branch.id} className="card admin-qr-branch-card admin-qr-branch-card--compact">
                  <div className="admin-qr-branch-card__head">
                    <div>
                      <h3>
                        #{branch.branchNo} {branch.name}
                      </h3>
                      {branch.address && <p className="hint-text">{branch.address}</p>}
                    </div>
                    {branch.pendingOrders > 0 && (
                      <span className="admin-badge pending">{branch.pendingOrders} bekleyen</span>
                    )}
                  </div>
                  <div className="admin-qr-branch-form">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={!!draft.menuEnabled}
                        onChange={(e) =>
                          setBranchDrafts((prev) => ({
                            ...prev,
                            [branch.id]: { ...draft, menuEnabled: e.target.checked },
                          }))
                        }
                      />
                      Müşteri seçim listesinde göster
                    </label>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={draft.menuAcceptOrders !== false}
                        onChange={(e) =>
                          setBranchDrafts((prev) => ({
                            ...prev,
                            [branch.id]: { ...draft, menuAcceptOrders: e.target.checked },
                          }))
                        }
                      />
                      Sipariş kabul et
                    </label>
                    <button type="button" className="btn btn-success btn-sm" onClick={() => saveBranchSettings(branch.id)}>
                      Kaydet
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "orders" && (
        <div className="card admin-qr-orders">
          <div className="filter-bar">
            <select
              value={orderFilter.branchId}
              onChange={(e) => setOrderFilter((prev) => ({ ...prev, branchId: e.target.value }))}
            >
              <option value="">Tüm şubeler</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  #{b.branchNo} {b.name}
                </option>
              ))}
            </select>
            <select
              value={orderFilter.status}
              onChange={(e) => setOrderFilter((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="pending">Bekleyen</option>
              <option value="accepted">Onaylanan</option>
              <option value="completed">Tamamlanan</option>
              <option value="rejected">Reddedilen</option>
              <option value="all">Tümü</option>
            </select>
          </div>

          {orders.length === 0 ? (
            <p className="admin-empty-inline">Bu filtrede sipariş yok.</p>
          ) : (
            <div className="admin-qr-order-list">
              {orders.map((order) => (
                <div key={order.id} className={`admin-qr-order-card status-${order.status}`}>
                  <div className="admin-qr-order-card__head">
                    <div>
                      <strong>{order.code}</strong>
                      <span className={`admin-badge ${STATUS_CLASS[order.status] || ""}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                    <strong>{formatMoney(order.total)}</strong>
                  </div>
                  <p className="admin-qr-order-branch">
                    <i className="fa fa-map-marker" /> Şube: #{order.branchNo} {order.branchName}
                  </p>
                  <p>
                    {order.customerName}
                    {order.customerPhone ? ` · ${order.customerPhone}` : ""}
                    {order.tableNo ? ` · Masa ${order.tableNo}` : ""}
                  </p>
                  {order.note && <p className="hint-text">Not: {order.note}</p>}
                  <ul className="admin-qr-order-items">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.qty}x {item.name} — {formatMoney(item.qty * item.price)}
                      </li>
                    ))}
                  </ul>
                  <div className="admin-qr-order-actions">
                    {order.status === "pending" && (
                      <>
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={() => updateOrderStatus(order.id, "accepted")}
                        >
                          Kabul Et
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => updateOrderStatus(order.id, "rejected")}
                        >
                          Reddet
                        </button>
                      </>
                    )}
                    {order.status === "accepted" && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => updateOrderStatus(order.id, "completed")}
                      >
                        Tamamlandı
                      </button>
                    )}
                  </div>
                  <small className="admin-qr-order-time">{new Date(order.createdAt).toLocaleString("tr-TR")}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
