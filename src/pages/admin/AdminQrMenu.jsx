import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { useLocale } from "../../context/LocaleContext";
import PageHeader from "../../components/ui/PageHeader";
import ProductImageField from "../../components/ProductImageField";
import QrSocialLinks from "../../components/public/QrSocialLinks";
import WebImageField from "../../components/admin/WebImageField";
import { normalizeWebConfig, createBannerId } from "../../utils/menuWebConfig";
import { getBranchLabel } from "../../utils/branchDisplay";
import { formatMoney } from "../../utils/format";
import { getMenuPublicUrl, getQrCodeUrl } from "../../utils/qrMenuPublic";

function WebConfigField({ label, children, hint }) {
  return (
    <>
      <label>{label}</label>
      {children}
      {hint ? <p className="hint-text">{hint}</p> : null}
    </>
  );
}

function WebItemVisibilityToggle({ checked, onChange, label }) {
  return (
    <label className="checkbox-row admin-qr-item-visible">
      <input type="checkbox" checked={checked !== false} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function AdminQrSectionCard({ id, title, hint, children, active = true }) {
  return (
    <div
      className={`card admin-qr-firm-card admin-qr-section-card${active ? " admin-qr-section-card--active" : ""}`}
      id={id}
      hidden={!active}
    >
      <h3>{title}</h3>
      {hint ? <p className="hint-text">{hint}</p> : null}
      {children}
    </div>
  );
}

const SETTINGS_NAV = [
  { id: "qr-section-link", labelKey: "admin.qr.navLink" },
  { id: "qr-section-page", labelKey: "admin.qr.navPage" },
  { id: "qr-section-logo", labelKey: "admin.qr.navLogo" },
  { id: "qr-section-promo", labelKey: "admin.qr.navPromo" },
  { id: "qr-section-order-strip", labelKey: "admin.qr.navOrderStrip" },
  { id: "qr-section-campaigns", labelKey: "admin.qr.navCampaigns" },
  { id: "qr-section-franchise", labelKey: "admin.qr.navFranchise" },
  { id: "qr-section-features", labelKey: "admin.qr.navFeatures" },
  { id: "qr-section-extra", labelKey: "admin.qr.navExtra" },
  { id: "qr-section-footer", labelKey: "admin.qr.navFooter" },
  { id: "qr-section-social", labelKey: "admin.qr.navSocial" },
  { id: "qr-section-branches", labelKey: "admin.qr.navBranches" },
];

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
  const [webConfigDraft, setWebConfigDraft] = useState(null);
  const [webImageUploads, setWebImageUploads] = useState({});
  const [logoValue, setLogoValue] = useState(undefined);
  const [branchDrafts, setBranchDrafts] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeSettingsSection, setActiveSettingsSection] = useState(SETTINGS_NAV[0].id);

  const applyFirmDraft = (firmData) => ({
    menuEnabled: firmData.menuEnabled !== false,
    menuTitle: firmData.menuTitle || "",
    menuWelcome: firmData.menuWelcome || "",
    socialInstagram: firmData.social?.instagram || "",
    socialWhatsapp: firmData.social?.whatsapp || "",
    socialTiktok: firmData.social?.tiktok || "",
    socialFacebook: firmData.social?.facebook || "",
    menuDefaultLang: firmData.defaultLang || "az",
    menuOpenTime: firmData.openTime || "09:00",
    menuCloseTime: firmData.closeTime || "23:00",
  });

  const loadSettings = async () => {
    const data = await api.getAdminQrMenu();
    setFirm(data.firm);
    setBranches(data.branches);
    setFirmDraft(applyFirmDraft(data.firm));
    setWebConfigDraft(normalizeWebConfig(data.firm.webConfig));
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

  const patchWeb = (key, value) => {
    setWebConfigDraft((prev) => ({ ...prev, [key]: value }));
  };

  const patchWebFeature = (index, key, value) => {
    setWebConfigDraft((prev) => ({
      ...prev,
      features: prev.features.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }));
  };

  const patchWebSlide = (index, key, value) => {
    setWebConfigDraft((prev) => ({
      ...prev,
      promoSlides: prev.promoSlides.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }));
  };

  const patchWebCampaign = (index, key, value) => {
    setWebConfigDraft((prev) => ({
      ...prev,
      campaignBanners: prev.campaignBanners.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }));
  };

  const patchWebOrderStrip = (index, key, value) => {
    setWebConfigDraft((prev) => ({
      ...prev,
      orderStrip: prev.orderStrip.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }));
  };

  const addPromoSlide = () => {
    setWebConfigDraft((prev) => ({
      ...prev,
      promoSlides: [...prev.promoSlides, { id: createBannerId("promo"), imageUrl: "", alt: "", enabled: true }],
    }));
  };

  const removePromoSlide = (index) => {
    setWebConfigDraft((prev) => ({
      ...prev,
      promoSlides: prev.promoSlides.filter((_, i) => i !== index),
    }));
  };

  const addCampaignBanner = () => {
    setWebConfigDraft((prev) => ({
      ...prev,
      campaignBanners: [...prev.campaignBanners, { id: createBannerId("campaign"), imageUrl: "", alt: "", enabled: true }],
    }));
  };

  const removeCampaignBanner = (index) => {
    setWebConfigDraft((prev) => ({
      ...prev,
      campaignBanners: prev.campaignBanners.filter((_, i) => i !== index),
    }));
  };

  const addOrderStripItem = () => {
    setWebConfigDraft((prev) => ({
      ...prev,
      orderStrip: [...prev.orderStrip, { id: createBannerId("orderStrip"), imageUrl: "", alt: "", action: "order", enabled: true }],
    }));
  };

  const removeOrderStripItem = (index) => {
    setWebConfigDraft((prev) => ({
      ...prev,
      orderStrip: prev.orderStrip.filter((_, i) => i !== index),
    }));
  };

  const setImageUpload = (key, value) => {
    setWebImageUploads((prev) => {
      if (!value) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  };

  const saveFirmSettings = async () => {
    setMessage("");
    setError("");
    try {
      const payload = {
        menuEnabled: firmDraft.menuEnabled,
        menuTitle: firmDraft.menuTitle,
        menuWelcome: firmDraft.menuWelcome,
        socialInstagram: firmDraft.socialInstagram ?? "",
        socialWhatsapp: firmDraft.socialWhatsapp ?? "",
        socialTiktok: firmDraft.socialTiktok ?? "",
        socialFacebook: firmDraft.socialFacebook ?? "",
        menuDefaultLang: firmDraft.menuDefaultLang,
        menuOpenTime: firmDraft.menuOpenTime,
        menuCloseTime: firmDraft.menuCloseTime,
        webConfig: webConfigDraft,
        webImageUploads,
      };
      if (logoValue === null) payload.removeLogo = true;
      else if (logoValue?.data) {
        payload.logoData = logoValue.data;
        payload.logoMime = logoValue.mime;
      }
      const data = await api.updateAdminQrMenu(payload);
      setFirm(data.firm);
      setFirmDraft(applyFirmDraft(data.firm));
      setWebConfigDraft(normalizeWebConfig(data.firm.webConfig));
      setWebImageUploads({});
      setLogoValue(undefined);
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

  const deleteBranch = async (branch) => {
    const label = getBranchLabel(branch, t("admin.qr.branchFallback"));
    if (!window.confirm(t("admin.qr.deleteBranchConfirm", { name: label }))) return;
    setMessage("");
    setError("");
    try {
      await api.deleteBranch(branch.id);
      await loadSettings();
      setMessage(t("admin.qr.branchDeleted"));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading || !webConfigDraft) return <div className="card">{t("common.loading")}</div>;

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
        <div className="admin-qr-settings-layout">
          <aside className="admin-qr-settings-sidebar" aria-label={t("admin.qr.settingsNavLabel")}>
            {SETTINGS_NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`admin-qr-settings-sidebar__item${activeSettingsSection === item.id ? " is-active" : ""}`}
                onClick={() => setActiveSettingsSection(item.id)}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </aside>

          <div className="admin-qr-settings-panel">
          <AdminQrSectionCard
            id="qr-section-link"
            title={t("admin.qr.sectionLink")}
            hint={t("admin.qr.sectionLinkHint")}
            active={activeSettingsSection === "qr-section-link"}
          >
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
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={!!firmDraft.menuEnabled}
                  onChange={(e) => setFirmDraft((prev) => ({ ...prev, menuEnabled: e.target.checked }))}
                />
                {t("admin.qr.menuActive")}
              </label>
              <WebConfigField label={t("admin.qr.loginUrl")} hint={t("admin.qr.loginUrlHint")}>
                <input
                  placeholder="https://login.cigkofte.az"
                  value={webConfigDraft.loginUrl || ""}
                  onChange={(e) => patchWeb("loginUrl", e.target.value)}
                />
              </WebConfigField>
            </div>
          </AdminQrSectionCard>

          <AdminQrSectionCard
            id="qr-section-page"
            title={t("admin.qr.sectionPageParams")}
            hint={t("admin.qr.sectionPageParamsHint")}
            active={activeSettingsSection === "qr-section-page"}
          >
            <div className="admin-qr-firm-form">
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
          </AdminQrSectionCard>

          <AdminQrSectionCard
            id="qr-section-logo"
            title={t("admin.qr.sectionLogoDesign")}
            hint={t("admin.qr.menuLogoHint")}
            active={activeSettingsSection === "qr-section-logo"}
          >
            <div className="admin-qr-logo-design">
              <div className="admin-qr-logo-upload">
                <label>{t("admin.qr.menuLogo")}</label>
                <ProductImageField
                  product={
                    firm?.hasLogo && logoValue !== null
                      ? { hasImage: true, id: "logo", imageUrl: firm.logoUrl }
                      : null
                  }
                  value={logoValue}
                  onChange={setLogoValue}
                />
              </div>
              <div className="admin-qr-design-preview">
                {logoPreviewSrc ? (
                  <img src={logoPreviewSrc} alt="" className="admin-qr-design-preview__logo" key={logoPreviewSrc} />
                ) : (
                  <div className="admin-qr-design-preview__logo admin-qr-design-preview__logo--empty">
                    <i className="fa fa-cutlery" />
                  </div>
                )}
                <strong>{firmDraft.menuTitle || t("admin.qr.menuTitle")}</strong>
                <span>{firmDraft.menuWelcome || "…"}</span>
              </div>
            </div>
          </AdminQrSectionCard>

          <AdminQrSectionCard
            id="qr-section-promo"
            title={t("admin.qr.sectionPromo")}
            hint={t("admin.qr.promoHint")}
            active={activeSettingsSection === "qr-section-promo"}
          >
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={webConfigDraft.showPromoSlider !== false}
                onChange={(e) => patchWeb("showPromoSlider", e.target.checked)}
              />
              {t("admin.qr.showPromoSlider")}
            </label>
            {webConfigDraft.promoSlides.map((slide, i) => (
              <div
                key={slide.id || `promo-${i}`}
                className={`admin-qr-web-block${slide.enabled === false ? " admin-qr-web-block--hidden" : ""}`}
              >
                <div className="admin-qr-web-block__head">
                  <strong>{t("admin.qr.promoSlide")} {i + 1}</strong>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removePromoSlide(i)}>
                    {t("admin.qr.removeBanner")}
                  </button>
                </div>
                <WebItemVisibilityToggle
                  checked={slide.enabled}
                  onChange={(value) => patchWebSlide(i, "enabled", value)}
                  label={t("admin.qr.showOnSite")}
                />
                <WebImageField
                  label={t("admin.qr.imageUrl")}
                  hint={t("admin.qr.imageUploadHint")}
                  imageKey={`promoSlide-${slide.id || i}`}
                  url={slide.imageUrl || ""}
                  onUrlChange={(value) => patchWebSlide(i, "imageUrl", value)}
                  upload={webImageUploads[`promoSlide-${slide.id || i}`]}
                  onUploadChange={setImageUpload}
                />
                <WebConfigField label={t("admin.qr.imageAlt")}>
                  <input value={slide.alt || ""} onChange={(e) => patchWebSlide(i, "alt", e.target.value)} />
                </WebConfigField>
              </div>
            ))}
            <button type="button" className="btn btn-default btn-sm admin-qr-add-banner" onClick={addPromoSlide}>
              + {t("admin.qr.addBanner")}
            </button>
          </AdminQrSectionCard>

          <AdminQrSectionCard
            id="qr-section-order-strip"
            title={t("admin.qr.sectionOrderStrip")}
            hint={t("admin.qr.orderStripHint")}
            active={activeSettingsSection === "qr-section-order-strip"}
          >
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={!!webConfigDraft.showOrderStrip}
                onChange={(e) => patchWeb("showOrderStrip", e.target.checked)}
              />
              {t("admin.qr.showOrderStrip")}
            </label>
            {webConfigDraft.orderStrip.map((item, i) => (
              <div
                key={item.id || `order-strip-${i}`}
                className={`admin-qr-web-block${item.enabled === false ? " admin-qr-web-block--hidden" : ""}`}
              >
                <div className="admin-qr-web-block__head">
                  <strong>{t("admin.qr.orderStripItem")} {i + 1}</strong>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeOrderStripItem(i)}>
                    {t("admin.qr.removeBanner")}
                  </button>
                </div>
                <WebItemVisibilityToggle
                  checked={item.enabled}
                  onChange={(value) => patchWebOrderStrip(i, "enabled", value)}
                  label={t("admin.qr.showOnSite")}
                />
                <WebImageField
                  label={t("admin.qr.imageUrl")}
                  hint={t("admin.qr.imageUploadHint")}
                  imageKey={`orderStrip-${item.id || i}`}
                  url={item.imageUrl || ""}
                  onUrlChange={(value) => patchWebOrderStrip(i, "imageUrl", value)}
                  upload={webImageUploads[`orderStrip-${item.id || i}`]}
                  onUploadChange={setImageUpload}
                />
                <WebConfigField label={t("admin.qr.imageAlt")}>
                  <input value={item.alt || ""} onChange={(e) => patchWebOrderStrip(i, "alt", e.target.value)} />
                </WebConfigField>
                <WebConfigField label={t("admin.qr.orderStripAction")}>
                  <select value={item.action || "order"} onChange={(e) => patchWebOrderStrip(i, "action", e.target.value)}>
                    <option value="order">{t("admin.qr.orderStripActionOrder")}</option>
                    <option value="branches">{t("admin.qr.orderStripActionBranches")}</option>
                    <option value="campaigns">{t("admin.qr.orderStripActionCampaigns")}</option>
                  </select>
                </WebConfigField>
              </div>
            ))}
            <button type="button" className="btn btn-default btn-sm admin-qr-add-banner" onClick={addOrderStripItem}>
              + {t("admin.qr.addBanner")}
            </button>
          </AdminQrSectionCard>

          <AdminQrSectionCard
            id="qr-section-campaigns"
            title={t("admin.qr.sectionCampaigns")}
            hint={t("admin.qr.campaignHint")}
            active={activeSettingsSection === "qr-section-campaigns"}
          >
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={webConfigDraft.showCampaigns !== false}
                onChange={(e) => patchWeb("showCampaigns", e.target.checked)}
              />
              {t("admin.qr.showCampaigns")}
            </label>
            {webConfigDraft.campaignBanners.map((banner, i) => (
              <div
                key={banner.id || `campaign-${i}`}
                className={`admin-qr-web-block${banner.enabled === false ? " admin-qr-web-block--hidden" : ""}`}
              >
                <div className="admin-qr-web-block__head">
                  <strong>{t("admin.qr.campaignBanner")} {i + 1}</strong>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeCampaignBanner(i)}>
                    {t("admin.qr.removeBanner")}
                  </button>
                </div>
                <WebItemVisibilityToggle
                  checked={banner.enabled}
                  onChange={(value) => patchWebCampaign(i, "enabled", value)}
                  label={t("admin.qr.showOnSite")}
                />
                <WebImageField
                  label={t("admin.qr.imageUrl")}
                  hint={t("admin.qr.imageUploadHint")}
                  imageKey={`campaign-${banner.id || i}`}
                  url={banner.imageUrl || ""}
                  onUrlChange={(value) => patchWebCampaign(i, "imageUrl", value)}
                  upload={webImageUploads[`campaign-${banner.id || i}`]}
                  onUploadChange={setImageUpload}
                />
                <WebConfigField label={t("admin.qr.imageAlt")}>
                  <input value={banner.alt || ""} onChange={(e) => patchWebCampaign(i, "alt", e.target.value)} />
                </WebConfigField>
              </div>
            ))}
            <button type="button" className="btn btn-default btn-sm admin-qr-add-banner" onClick={addCampaignBanner}>
              + {t("admin.qr.addBanner")}
            </button>
          </AdminQrSectionCard>

          <AdminQrSectionCard
            id="qr-section-franchise"
            title={t("admin.qr.sectionFranchise")}
            active={activeSettingsSection === "qr-section-franchise"}
          >
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={!!webConfigDraft.showFranchise}
                onChange={(e) => patchWeb("showFranchise", e.target.checked)}
              />
              {t("admin.qr.showFranchise")}
            </label>
            <WebImageField
              label={t("admin.qr.franchiseBackgroundUrl")}
              hint={t("admin.qr.imageUploadHint")}
              imageKey="franchiseBackgroundUrl"
              url={webConfigDraft.franchiseBackgroundUrl || ""}
              onUrlChange={(value) => patchWeb("franchiseBackgroundUrl", value)}
              upload={webImageUploads.franchiseBackgroundUrl}
              onUploadChange={setImageUpload}
            />
            <WebImageField
              label={t("admin.qr.franchiseIconUrl")}
              hint={t("admin.qr.imageUploadHint")}
              imageKey="franchiseIconUrl"
              url={webConfigDraft.franchiseIconUrl || ""}
              onUrlChange={(value) => patchWeb("franchiseIconUrl", value)}
              upload={webImageUploads.franchiseIconUrl}
              onUploadChange={setImageUpload}
            />
            <div className="admin-qr-firm-form">
              <WebConfigField label={t("admin.qr.franchiseTitle1")}>
                <input
                  value={webConfigDraft.franchiseTitle1 || ""}
                  onChange={(e) => patchWeb("franchiseTitle1", e.target.value)}
                />
              </WebConfigField>
              <WebConfigField label={t("admin.qr.franchiseTitle2")}>
                <input
                  value={webConfigDraft.franchiseTitle2 || ""}
                  onChange={(e) => patchWeb("franchiseTitle2", e.target.value)}
                />
              </WebConfigField>
              <WebConfigField label={t("admin.qr.franchiseSubtitle")}>
                <input
                  value={webConfigDraft.franchiseSubtitle || ""}
                  onChange={(e) => patchWeb("franchiseSubtitle", e.target.value)}
                />
              </WebConfigField>
              <WebConfigField label={t("admin.qr.franchiseText")} hint={t("admin.qr.franchiseTextHint")}>
                <textarea
                  rows={3}
                  value={webConfigDraft.franchiseText || ""}
                  onChange={(e) => patchWeb("franchiseText", e.target.value)}
                />
              </WebConfigField>
            </div>
          </AdminQrSectionCard>

          <AdminQrSectionCard
            id="qr-section-features"
            title={t("admin.qr.sectionFeatures")}
            active={activeSettingsSection === "qr-section-features"}
          >
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={webConfigDraft.showFeatures !== false}
                onChange={(e) => patchWeb("showFeatures", e.target.checked)}
              />
              {t("admin.qr.showFeatures")}
            </label>
            {webConfigDraft.features.map((feature, i) => (
              <div
                key={`feature-${i}`}
                className={`admin-qr-web-block${feature.enabled === false ? " admin-qr-web-block--hidden" : ""}`}
              >
                <strong>{t("admin.qr.featureBox")} {i + 1}</strong>
                <WebItemVisibilityToggle
                  checked={feature.enabled}
                  onChange={(value) => patchWebFeature(i, "enabled", value)}
                  label={t("admin.qr.showOnSite")}
                />
                <WebImageField
                  label={t("admin.qr.featureIconUrl")}
                  hint={t("admin.qr.imageUploadHint")}
                  imageKey={`feature-${i}`}
                  url={feature.iconUrl || ""}
                  onUrlChange={(value) => patchWebFeature(i, "iconUrl", value)}
                  upload={webImageUploads[`feature-${i}`]}
                  onUploadChange={setImageUpload}
                />
                <WebConfigField label={t("admin.qr.featureTitle")}>
                  <input
                    value={feature.title || ""}
                    onChange={(e) => patchWebFeature(i, "title", e.target.value)}
                  />
                </WebConfigField>
                <WebConfigField label={t("admin.qr.featureDesc")}>
                  <textarea
                    rows={2}
                    value={feature.desc || ""}
                    onChange={(e) => patchWebFeature(i, "desc", e.target.value)}
                  />
                </WebConfigField>
              </div>
            ))}
          </AdminQrSectionCard>

          <AdminQrSectionCard
            id="qr-section-extra"
            title={t("admin.qr.sectionBanners")}
            active={activeSettingsSection === "qr-section-extra"}
          >
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={!!webConfigDraft.showLezzetlerBanner}
                onChange={(e) => patchWeb("showLezzetlerBanner", e.target.checked)}
              />
              {t("admin.qr.showLezzetlerBanner")}
            </label>
            <WebImageField
              label={t("admin.qr.lezzetlerImageUrl")}
              hint={t("admin.qr.imageUploadHint")}
              imageKey="lezzetlerImageUrl"
              url={webConfigDraft.lezzetlerImageUrl || ""}
              onUrlChange={(value) => patchWeb("lezzetlerImageUrl", value)}
              upload={webImageUploads.lezzetlerImageUrl}
              onUploadChange={setImageUpload}
            />
          </AdminQrSectionCard>

          <AdminQrSectionCard
            id="qr-section-footer"
            title={t("admin.qr.sectionFooter")}
            hint={t("admin.qr.sectionFooterHint")}
            active={activeSettingsSection === "qr-section-footer"}
          >
            <div className="admin-qr-firm-form">
              <WebConfigField label={t("admin.qr.contactPhone")}>
                <input
                  placeholder="+994501234567"
                  value={webConfigDraft.contactPhone || ""}
                  onChange={(e) => patchWeb("contactPhone", e.target.value)}
                />
              </WebConfigField>
              <WebConfigField label={t("admin.qr.contactEmail")}>
                <input
                  placeholder="info@cigkofte.az"
                  value={webConfigDraft.contactEmail || ""}
                  onChange={(e) => patchWeb("contactEmail", e.target.value)}
                />
              </WebConfigField>
              <WebImageField
                label={t("admin.qr.footerBadgeUrl")}
                hint={t("admin.qr.imageUploadHint")}
                imageKey="footerBadgeUrl"
                url={webConfigDraft.footerBadgeUrl || ""}
                onUrlChange={(value) => patchWeb("footerBadgeUrl", value)}
                upload={webImageUploads.footerBadgeUrl}
                onUploadChange={setImageUpload}
              />
              <WebConfigField label={t("admin.qr.copyrightSuffix")}>
                <input
                  value={webConfigDraft.copyrightSuffix || ""}
                  onChange={(e) => patchWeb("copyrightSuffix", e.target.value)}
                />
              </WebConfigField>
            </div>
          </AdminQrSectionCard>

          <AdminQrSectionCard
            id="qr-section-social"
            title={t("admin.qr.sectionSocial")}
            hint={t("admin.qr.socialHint")}
            active={activeSettingsSection === "qr-section-social"}
          >
            <div className="admin-qr-social-form">
              <label>
                <i className="fa-brands fa-instagram admin-qr-social-icon admin-qr-social-icon--fab" />
                {t("admin.qr.socialInstagram")}
              </label>
              <input
                placeholder="@cigkofte veya https://instagram.com/..."
                value={firmDraft.socialInstagram || ""}
                onChange={(e) => setFirmDraft((prev) => ({ ...prev, socialInstagram: e.target.value }))}
              />
              <label>
                <i className="fa-brands fa-whatsapp admin-qr-social-icon admin-qr-social-icon--fab" />
                {t("admin.qr.socialWhatsapp")}
              </label>
              <input
                placeholder="+994501234567"
                value={firmDraft.socialWhatsapp || ""}
                onChange={(e) => setFirmDraft((prev) => ({ ...prev, socialWhatsapp: e.target.value }))}
              />
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={webConfigDraft.showWhatsappFloat !== false}
                  onChange={(e) => patchWeb("showWhatsappFloat", e.target.checked)}
                />
                {t("admin.qr.showWhatsappFloat")}
              </label>
              <WebConfigField
                label={t("admin.qr.whatsappFloatPhone")}
                hint={t("admin.qr.whatsappFloatPhoneHint")}
              >
                <input
                  placeholder="+994501234567"
                  value={webConfigDraft.whatsappFloatPhone || ""}
                  onChange={(e) => patchWeb("whatsappFloatPhone", e.target.value)}
                />
              </WebConfigField>
              <label>
                <i className="fa-brands fa-facebook-f admin-qr-social-icon admin-qr-social-icon--fab" />
                {t("admin.qr.socialFacebook")}
              </label>
              <input
                placeholder="cigkofte veya https://facebook.com/..."
                value={firmDraft.socialFacebook || ""}
                onChange={(e) => setFirmDraft((prev) => ({ ...prev, socialFacebook: e.target.value }))}
              />
              <label>
                <i className="fa-brands fa-tiktok admin-qr-social-icon admin-qr-social-icon--fab" />
                {t("admin.qr.socialTiktok")}
              </label>
              <input
                placeholder="@cigkofte veya https://tiktok.com/@..."
                value={firmDraft.socialTiktok || ""}
                onChange={(e) => setFirmDraft((prev) => ({ ...prev, socialTiktok: e.target.value }))}
              />
              <div className="admin-qr-social-preview">
                <span>{t("admin.qr.socialPreview")}</span>
                <QrSocialLinks social={socialPreview} variant="fab" />
              </div>
            </div>
          </AdminQrSectionCard>

          <AdminQrSectionCard
            id="qr-section-branches"
            title={t("admin.qr.branchesTitle")}
            active={activeSettingsSection === "qr-section-branches"}
          >
          <div className="admin-qr-settings">
            {branches.filter((b) => b.active !== false).map((branch) => {
              const draft = branchDrafts[branch.id] || {};
              return (
                <div key={branch.id} className="card admin-qr-branch-card admin-qr-branch-card--compact">
                  <div className="admin-qr-branch-card__head">
                    <div>
                      <h3>{getBranchLabel(branch)}</h3>
                      {branch.address && <p className="hint-text">{branch.address}</p>}
                    </div>
                    <div className="admin-qr-branch-card__actions">
                      {branch.pendingOrders > 0 && (
                        <span className="admin-badge pending">
                          {branch.pendingOrders} {t("admin.qr.pending")}
                        </span>
                      )}
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteBranch(branch)}
                      >
                        {t("admin.qr.deleteBranch")}
                      </button>
                    </div>
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
          </AdminQrSectionCard>

          {activeSettingsSection !== "qr-section-branches" && (
            <div className="admin-qr-save-all-wrap">
              <button type="button" className="btn btn-success" onClick={saveFirmSettings}>
                {t("admin.qr.saveFirm")}
              </button>
            </div>
          )}
          </div>
        </div>
      )}

      {tab === "orders" && (
        <div className="card admin-qr-orders">
          <div className="filter-bar">
            <select
              value={orderFilter.branchId}
              onChange={(e) => setOrderFilter((prev) => ({ ...prev, branchId: e.target.value }))}
            >
              <option value="">Tüm şubeler</option>
              {branches.filter((b) => b.active !== false).map((b) => (
                <option key={b.id} value={b.id}>
                  {getBranchLabel(b)}
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
                    <i className="fa fa-map-marker" /> {getBranchLabel({ name: order.branchName })}
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
