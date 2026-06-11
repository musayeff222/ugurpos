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

function withBannerId(item, prefix, index) {
  return {
    ...item,
    id: item?.id || `${prefix}-${index}`,
  };
}

function normalizePromoSlides(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_MENU_WEB_CONFIG.promoSlides.map((item, i) => withBannerId(item, "promo", i));
  }
  return raw.map((item, i) =>
    withBannerId({ imageUrl: item.imageUrl || "", alt: item.alt ?? "" }, "promo", i)
  );
}

function normalizeCampaignBanners(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_MENU_WEB_CONFIG.campaignBanners.map((item, i) => withBannerId(item, "campaign", i));
  }
  return raw.map((item, i) =>
    withBannerId({ imageUrl: item.imageUrl || "", alt: item.alt ?? "" }, "campaign", i)
  );
}

function normalizeOrderStrip(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_MENU_WEB_CONFIG.orderStrip.map((item, i) => withBannerId(item, "orderStrip", i));
  }
  return raw.map((item, i) =>
    withBannerId(
      {
        imageUrl: item.imageUrl || "",
        alt: item.alt ?? "",
        action: item.action || "order",
      },
      "orderStrip",
      i
    )
  );
}

export function createBannerId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizeWebConfig(raw) {
  if (!raw) {
    return {
      ...DEFAULT_MENU_WEB_CONFIG,
      orderStrip: DEFAULT_MENU_WEB_CONFIG.orderStrip.map((s, i) => withBannerId(s, "orderStrip", i)),
      features: DEFAULT_MENU_WEB_CONFIG.features.map((f) => ({ ...f })),
      promoSlides: DEFAULT_MENU_WEB_CONFIG.promoSlides.map((s, i) => withBannerId(s, "promo", i)),
      campaignBanners: DEFAULT_MENU_WEB_CONFIG.campaignBanners.map((s, i) => withBannerId(s, "campaign", i)),
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
    promoSlides: normalizePromoSlides(raw.promoSlides),
    campaignBanners: normalizeCampaignBanners(raw.campaignBanners),
  };
}

export function getWebConfig(firm) {
  return normalizeWebConfig(firm?.webConfig);
}

export function getWebImagePreviewUrl(url, pendingUpload) {
  if (pendingUpload?.previewUrl) return pendingUpload.previewUrl;
  return url || "";
}
