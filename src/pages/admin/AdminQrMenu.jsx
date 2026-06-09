import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { useLocale } from "../../context/LocaleContext";
import PageHeader from "../../components/ui/PageHeader";
import ProductImageField from "../../components/ProductImageField";
import QrSocialLinks from "../../components/public/QrSocialLinks";
import { QR_MENU_THEMES } from "../../constants/qrMenuThemes";
import { formatMoney } from "../../utils/format";
import { getMenuPublicUrl, getQrCodeUrl } from "../../utils/qrMenuPublic";

const THEME_LABEL_KEYS = {
  classic: "admin.qr.themeClassic",
  dark: "admin.qr.themeDark",
  fresh: "admin.qr.themeFresh",
  elegant: "admin.qr.themeElegant",
};

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
  const { t, lang } = useLocale();
  const [tab, setTab] = useState("settings");
  const [firm, setFirm] = useState(null);
  const [branches, setBranches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState({ branchId: "", status: "pending" });
  const [firmDraft, setFirmDraft] = useState({});
  const [logoValue, setLogoValue] = useState(undefined);
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
      socialInstagram: data.firm.social?.instagram || "",
      socialWhatsapp: data.firm.social?.whatsapp || "",
      socialTiktok: data.firm.social?.tiktok || "",
      socialFacebook: data.firm.social?.facebook || "",
      menuDefaultLang: data.firm.defaultLang || "az",
      menuOpenTime: data.firm.openTime || "09:00",
      menuCloseTime: data.firm.closeTime || "23:00",
      menuTheme: data.firm.theme || "classic",
    });
    setLogoValue(undefined);
    setBranchDrafts(
      Object.fromEntries(
        data.branches.map((b) => [
          b.id,
          {
            menuEnabled: b.menuEnabled,
            menuAcceptOrders: b.menuAcceptOrders,
            menuLat: b.lat ?? "",
            menuLng: b.lng ?? "",
            menuOpenTime: b.openTime || "",
            menuCloseTime: b.closeTime || "",
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

  const logoPreviewSrc =
    logoValue === null
      ? null
      : logoValue?.previewUrl || (logoValue === undefined && firm?.logoUrl ? firm.logoUrl : null);

  const socialPreview = {
    instagram: firmDraft.socialInstagram || "",
    whatsapp: firmDraft.socialWhatsapp || "",
    tiktok: firmDraft.socialTiktok || "",
    facebook: firmDraft.socialFacebook || "",
  };

  const selectedTheme = QR_MENU_THEMES.find((item) => item.id === (firmDraft.menuTheme || "classic"));

  const saveFirmSettings = async () => {
    setMessage("");
    setError("");
    try {
      const payload = { ...firmDraft };
      if (logoValue === null) payload.removeLogo = true;
      else if (logoValue?.data) {
        payload.logoData = logoValue.data;
        payload.logoMime = logoValue.mime;
      }
      await api.updateAdminQrMenu(payload);
      await loadSettings();
      setMessage(t("admin.qr.firmSaved"));
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
      setMessage(t("admin.qr.branchSaved"));
    } catch (err) {
      setError(err.message);
    }
  };

  const copyLink = async () => {
    if (!menuUrl) return;
    await navigator.clipboard.writeText(menuUrl);
    setMessage(t("admin.qr.linkCopied"));
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

  if (loading) return <div className="card">{t("common.loading")}</div>;

  return (
    <div className="admin-page admin-qr-page">
      <PageHeader title={t("admin.qr.title")} subtitle={t("admin.qr.subtitle")} />

      {message && <div className="alert alert-info">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <ul className="admin-tabs">
        <li>
          <button type="button" className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>
            {t("admin.qr.tabSettings")}
          </button>
        </li>
        <li>
          <button type="button" className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>
            {t("admin.qr.tabOrders")} {pendingTotal > 0 && <span className="admin-qr-badge">{pendingTotal}</span>}
          </button>
        </li>
      </ul>

      {tab === "settings" && (
        <>
          <div className="card admin-qr-firm-card">
            <h3>{t("admin.qr.menuLink")}</h3>

            {menuUrl && (
              <div className="admin-qr-firm-link">
                {!firm?.menuEnabled && (
                  <div className="alert alert-danger">{t("admin.qr.menuClosed")}</div>
                )}
                <img src={getQrCodeUrl(menuUrl)} alt="Online sipariş" className="admin-qr-code" />
                <code className="admin-qr-url">{menuUrl}</code>
                <div className="admin-qr-firm-actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={copyLink}>
                    {t("admin.qr.copyLink")}
                  </button>
                  <a href={menuUrl} target="_blank" rel="noopener noreferrer" className="btn btn-default btn-sm">
                    {t("admin.qr.openMenu")}
                  </a>
                </div>
              </div>
            )}

            <div className="admin-qr-firm-form">
              <h4 className="admin-qr-section-title">{t("admin.qr.sectionGeneral")}</h4>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={!!firmDraft.menuEnabled}
                  onChange={(e) => setFirmDraft((prev) => ({ ...prev, menuEnabled: e.target.checked }))}
                />
                {t("admin.qr.menuActive")}
              </label>
              <label>{t("admin.qr.menuTitle")}</label>
              <input
                value={firmDraft.menuTitle || ""}
                onChange={(e) => setFirmDraft((prev) => ({ ...prev, menuTitle: e.target.value }))}
              />
              <label>{t("admin.qr.menuWelcome")}</label>
              <textarea
                rows={2}
                value={firmDraft.menuWelcome || ""}
                onChange={(e) => setFirmDraft((prev) => ({ ...prev, menuWelcome: e.target.value }))}
              />
              <label>{t("admin.qr.menuHours")}</label>
              <div className="admin-qr-hours-row">
                <input
                  type="time"
                  value={firmDraft.menuOpenTime || "09:00"}
                  onChange={(e) => setFirmDraft((prev) => ({ ...prev, menuOpenTime: e.target.value }))}
                />
                <span>–</span>
                <input
                  type="time"
                  value={firmDraft.menuCloseTime || "23:00"}
                  onChange={(e) => setFirmDraft((prev) => ({ ...prev, menuCloseTime: e.target.value }))}
                />
              </div>
              <label>{t("admin.qr.defaultLang")}</label>
              <select
                value={firmDraft.menuDefaultLang || "az"}
                onChange={(e) => setFirmDraft((prev) => ({ ...prev, menuDefaultLang: e.target.value }))}
              >
                <option value="az">Azərbaycan</option>
                <option value="tr">Türkçe</option>
              </select>
            </div>
          </div>

          <div className="card admin-qr-firm-card">
            <h3>{t("admin.qr.sectionLogoDesign")}</h3>
            <p className="hint-text">{t("admin.qr.menuLogoHint")}</p>
            <div className="admin-qr-logo-design">
              <div className="admin-qr-logo-upload">
                <label>{t("admin.qr.menuLogo")}</label>
                <ProductImageField
                  product={firm?.hasLogo && logoValue !== null ? { hasImage: true, id: "logo" } : null}
                  value={logoValue}
                  onChange={setLogoValue}
                />
              </div>
              <div
                className={`admin-qr-design-preview qr-theme-${firmDraft.menuTheme || "classic"}`}
                style={selectedTheme ? { background: selectedTheme.preview } : undefined}
              >
                {logoPreviewSrc ? (
                  <img src={logoPreviewSrc} alt="" className="admin-qr-design-preview__logo" />
                ) : (
                  <div className="admin-qr-design-preview__logo admin-qr-design-preview__logo--empty">
                    <i className="fa fa-cutlery" />
                  </div>
                )}
                <strong>{firmDraft.menuTitle || t("admin.qr.menuTitle")}</strong>
                <span>{firmDraft.menuWelcome || "…"}</span>
              </div>
            </div>

            <label>{t("admin.qr.menuDesign")}</label>
            <p className="hint-text admin-qr-design-hint">{t("admin.qr.menuDesignHint")}</p>
            <div className="admin-qr-theme-grid">
              {QR_MENU_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`admin-qr-theme-card ${firmDraft.menuTheme === theme.id ? "active" : ""}`}
                  onClick={() => setFirmDraft((prev) => ({ ...prev, menuTheme: theme.id }))}
                >
                  <span className="admin-qr-theme-card__swatch" style={{ background: theme.preview }} />
                  <span className="admin-qr-theme-card__colors">
                    {theme.swatch.map((color) => (
                      <i key={color} style={{ background: color }} />
                    ))}
                  </span>
                  <strong>{t(THEME_LABEL_KEYS[theme.id])}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="card admin-qr-firm-card">
            <h3>{t("admin.qr.sectionSocial")}</h3>
            <p className="hint-text">{t("admin.qr.socialHint")}</p>
            <div className="admin-qr-social-form">
              <label>
                <i className="fa fa-instagram admin-qr-social-icon admin-qr-social-icon--ig" />
                {t("admin.qr.socialInstagram")}
              </label>
              <input
                placeholder="@cigkofte veya https://instagram.com/..."
                value={firmDraft.socialInstagram || ""}
                onChange={(e) => setFirmDraft((prev) => ({ ...prev, socialInstagram: e.target.value }))}
              />
              <label>
                <i className="fa fa-whatsapp admin-qr-social-icon admin-qr-social-icon--wa" />
                {t("admin.qr.socialWhatsapp")}
              </label>
              <input
                placeholder="+994501234567"
                value={firmDraft.socialWhatsapp || ""}
                onChange={(e) => setFirmDraft((prev) => ({ ...prev, socialWhatsapp: e.target.value }))}
              />
              <label>
                <i className="fa fa-facebook admin-qr-social-icon admin-qr-social-icon--fb" />
                {t("admin.qr.socialFacebook")}
              </label>
              <input
                placeholder="cigkofte veya https://facebook.com/..."
                value={firmDraft.socialFacebook || ""}
                onChange={(e) => setFirmDraft((prev) => ({ ...prev, socialFacebook: e.target.value }))}
              />
              <label>
                <i className="fa fa-music admin-qr-social-icon admin-qr-social-icon--tt" />
                {t("admin.qr.socialTiktok")}
              </label>
              <input
                placeholder="@cigkofte veya https://tiktok.com/@..."
                value={firmDraft.socialTiktok || ""}
                onChange={(e) => setFirmDraft((prev) => ({ ...prev, socialTiktok: e.target.value }))}
              />
              <div className="admin-qr-social-preview">
                <span>{t("admin.qr.socialPreview")}</span>
                <QrSocialLinks social={socialPreview} />
              </div>
            </div>
          </div>

          <div className="admin-qr-save-all-wrap">
            <button type="button" className="btn btn-success" onClick={saveFirmSettings}>
              {t("admin.qr.saveFirm")}
            </button>
          </div>

          <h3 className="admin-section-title">{t("admin.qr.branchesTitle")}</h3>
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
                      <span className="admin-badge pending">
                        {branch.pendingOrders} {t("admin.qr.pending")}
                      </span>
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
                      {t("admin.qr.showInPicker")}
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
                      {t("admin.qr.acceptOrders")}
                    </label>
                    <label>{t("admin.qr.branchLocation")}</label>
                    <div className="admin-qr-hours-row">
                      <input
                        placeholder="Lat"
                        value={draft.menuLat ?? ""}
                        onChange={(e) =>
                          setBranchDrafts((prev) => ({
                            ...prev,
                            [branch.id]: { ...draft, menuLat: e.target.value },
                          }))
                        }
                      />
                      <input
                        placeholder="Lng"
                        value={draft.menuLng ?? ""}
                        onChange={(e) =>
                          setBranchDrafts((prev) => ({
                            ...prev,
                            [branch.id]: { ...draft, menuLng: e.target.value },
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-default btn-sm"
                        onClick={() => {
                          if (!navigator.geolocation) return;
                          navigator.geolocation.getCurrentPosition((pos) => {
                            setBranchDrafts((prev) => ({
                              ...prev,
                              [branch.id]: {
                                ...draft,
                                menuLat: String(pos.coords.latitude),
                                menuLng: String(pos.coords.longitude),
                              },
                            }));
                          });
                        }}
                      >
                        {t("admin.qr.useMyLocation")}
                      </button>
                    </div>
                    <label>{t("admin.qr.branchHours")}</label>
                    <div className="admin-qr-hours-row">
                      <input
                        type="time"
                        value={draft.menuOpenTime || ""}
                        onChange={(e) =>
                          setBranchDrafts((prev) => ({
                            ...prev,
                            [branch.id]: { ...draft, menuOpenTime: e.target.value },
                          }))
                        }
                      />
                      <span>–</span>
                      <input
                        type="time"
                        value={draft.menuCloseTime || ""}
                        onChange={(e) =>
                          setBranchDrafts((prev) => ({
                            ...prev,
                            [branch.id]: { ...draft, menuCloseTime: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <button type="button" className="btn btn-success btn-sm" onClick={() => saveBranchSettings(branch.id)}>
                      {t("common.save")}
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
                    <strong>{formatMoney(order.total, lang)}</strong>
                  </div>
                  <p className="admin-qr-order-branch">
                    <i className="fa fa-map-marker" /> Şube: #{order.branchNo} {order.branchName}
                  </p>
                  <p>
                    {order.customerName}
                    {order.customerPhone ? ` · ${order.customerPhone}` : ""}
                  </p>
                  {(order.deliveryAddress || order.tableNo) && (
                    <p className="hint-text">
                      {t("admin.order.address")}: {order.deliveryAddress || order.tableNo}
                    </p>
                  )}
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
