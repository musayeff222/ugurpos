/** Admin + public web sayfası ayarları (server menuWebConfig.js ile uyumlu) */

export const DEFAULT_MENU_WEB_CONFIG = {
  contactPhone: "",
  contactEmail: "",
  loginUrl: "https://login.cigkofte.az",
  footerBadgeUrl: "/oses/assets/images/oses-25yil.png",
  copyrightSuffix: "Her hakkı saklıdır.",
  showFranchise: true,
  franchiseTitle1: "KENDİ İŞİNİ KUR,",
  franchiseTitle2: "LEZZETE ORTAK OL!",
  franchiseSubtitle: "FRANCHISE BEDELİ YOK!",
  franchiseText: "",
  franchiseBackgroundUrl: "/oses/assets/images/basvur.jpg",
  franchiseIconUrl: "/oses/assets/images/franchise-icon.png",
  showLezzetlerBanner: true,
  lezzetlerImageUrl: "/oses/assets/images/oses-lezzetleri.jpg",
  showOrderStrip: true,
  orderStrip: [
    { imageUrl: "/oses/assets/images/oses-yemeksepeti.jpg", alt: "Online Sipariş Ver", action: "order" },
    { imageUrl: "/oses/assets/images/oses-getir.jpg", alt: "Menüyü İncele", action: "order" },
    { imageUrl: "/oses/assets/images/hemen_siparis_ver.png", alt: "Hemen Sipariş Ver", action: "order" },
    { imageUrl: "/oses/assets/images/en_yakin_oses.png", alt: "En Yakın Şube", action: "branches" },
    { imageUrl: "/oses/assets/images/kampanyalar.png", alt: "Kampanyalar", action: "campaigns" },
  ],
  features: [
    {
      iconUrl: "/oses/assets/images/ico_bayilik.png",
      title: "Online Sipariş",
      desc: "Şubenizi seçin, menüden sipariş verin, kapınıza gelsin.",
    },
    {
      iconUrl: "/oses/assets/images/ico_kalite.png",
      title: "Kalite Standartları",
      desc: "Üretimden hizmete kadar her aşamada yüksek kalite standartlarını koruyoruz.",
    },
    {
      iconUrl: "/oses/assets/images/ico_gida-guvenligi.png",
      title: "Gıda Güvenliği",
      desc: "Hijyen ve gıda güvenliği kurallarına tam uyum sağlıyoruz.",
    },
    {
      iconUrl: "/oses/assets/images/ico_tuketici.png",
      title: "Tüketici Memnuniyeti",
      desc: "Müşterilerimizin yüzündeki gülümseme için çalışıyoruz.",
    },
  ],
  promoSlides: [
    { imageUrl: "/oses/photos/promo/promo-3.jpg", alt: "Çiğ Köfteler İkiye Ayrılır" },
    { imageUrl: "/oses/photos/promo/promo-1.jpg", alt: "İstanbul Çiğköfte" },
    { imageUrl: "/oses/photos/promo/promo-2.jpg", alt: "İstanbul Çiğköfte" },
  ],
  campaignBanners: [
    { imageUrl: "/oses/photos/onecikanlar/tatli-severler.jpg", alt: "Tatlı Severler" },
    { imageUrl: "/oses/photos/onecikanlar/mutluluga-doyma-zamani.jpg", alt: "Mutluluğa Doyma Zamanı" },
  ],
};

function normalizeOrderStrip(raw) {
  const defaults = DEFAULT_MENU_WEB_CONFIG.orderStrip.map((s) => ({ ...s }));
  if (!Array.isArray(raw) || raw.length === 0) return defaults;
  return defaults.map((item, i) => ({
    imageUrl: raw[i]?.imageUrl || item.imageUrl,
    alt: raw[i]?.alt ?? item.alt,
    action: raw[i]?.action || item.action || "order",
  }));
}

export function normalizeWebConfig(raw) {
  if (!raw) {
    return {
      ...DEFAULT_MENU_WEB_CONFIG,
      orderStrip: DEFAULT_MENU_WEB_CONFIG.orderStrip.map((s) => ({ ...s })),
      features: DEFAULT_MENU_WEB_CONFIG.features.map((f) => ({ ...f })),
      promoSlides: DEFAULT_MENU_WEB_CONFIG.promoSlides.map((s) => ({ ...s })),
      campaignBanners: DEFAULT_MENU_WEB_CONFIG.campaignBanners.map((s) => ({ ...s })),
    };
  }
  return {
    ...DEFAULT_MENU_WEB_CONFIG,
    ...raw,
    orderStrip: normalizeOrderStrip(raw.orderStrip),
    features:
      Array.isArray(raw.features) && raw.features.length === 4
        ? raw.features.map((f, i) => ({
            iconUrl: f.iconUrl || DEFAULT_MENU_WEB_CONFIG.features[i].iconUrl,
            title: f.title ?? DEFAULT_MENU_WEB_CONFIG.features[i].title,
            desc: f.desc ?? DEFAULT_MENU_WEB_CONFIG.features[i].desc,
          }))
        : DEFAULT_MENU_WEB_CONFIG.features.map((f) => ({ ...f })),
    promoSlides:
      Array.isArray(raw.promoSlides) && raw.promoSlides.length > 0
        ? raw.promoSlides.map((s) => ({ ...s }))
        : DEFAULT_MENU_WEB_CONFIG.promoSlides.map((s) => ({ ...s })),
    campaignBanners:
      Array.isArray(raw.campaignBanners) && raw.campaignBanners.length > 0
        ? raw.campaignBanners.map((s) => ({ ...s }))
        : DEFAULT_MENU_WEB_CONFIG.campaignBanners.map((s) => ({ ...s })),
  };
}

export function getWebConfig(firm) {
  return normalizeWebConfig(firm?.webConfig);
}

export function getWebImagePreviewUrl(url, pendingUpload) {
  if (pendingUpload?.previewUrl) return pendingUpload.previewUrl;
  return url || "";
}
