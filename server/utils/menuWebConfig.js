/** Web sipariş sayfası admin ayarları — JSON olarak firm_settings.menu_web_config */

import { saveMenuWebImage } from "./menuWebImage.js";

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
  showPromoSlider: true,
  showCampaigns: true,
  showFeatures: true,
  showOrderStrip: true,
  showWhatsappFloat: true,
  whatsappFloatPhone: "",
  showOrderStripFillImage: true,
  orderStripFillImageUrl: "/oses/assets/images/oses-lezzetleri.jpg",
  orderStripFillImageAlt: "İstanbul Çiğköfte",
  orderStripFillAction: "order",
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

const DIRECT_IMAGE_KEYS = new Set([
  "footerBadgeUrl",
  "lezzetlerImageUrl",
  "franchiseBackgroundUrl",
  "franchiseIconUrl",
  "orderStripFillImageUrl",
]);

function cloneDefaultFeatures() {
  return DEFAULT_MENU_WEB_CONFIG.features.map((f) => ({ ...f }));
}

function cloneDefaultSlides(key) {
  return DEFAULT_MENU_WEB_CONFIG[key].map((s) => ({ ...s }));
}

function withBannerId(item, prefix, index) {
  return {
    ...item,
    id: item?.id || `${prefix}-${index}`,
    enabled: item?.enabled !== false,
  };
}

function normalizePromoSlides(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return cloneDefaultSlides("promoSlides").map((item, i) => withBannerId(item, "promo", i));
  }
  return raw.map((item, i) =>
    withBannerId(
      {
        imageUrl: item.imageUrl || "",
        alt: item.alt ?? "",
        enabled: item.enabled,
      },
      "promo",
      i
    )
  );
}

function normalizeCampaignBanners(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return cloneDefaultSlides("campaignBanners").map((item, i) => withBannerId(item, "campaign", i));
  }
  return raw.map((item, i) =>
    withBannerId(
      {
        imageUrl: item.imageUrl || "",
        alt: item.alt ?? "",
        enabled: item.enabled,
      },
      "campaign",
      i
    )
  );
}

function normalizeOrderStrip(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return cloneDefaultSlides("orderStrip").map((item, i) => withBannerId(item, "orderStrip", i));
  }
  return raw.map((item, i) =>
    withBannerId(
      {
        imageUrl: item.imageUrl || "",
        alt: item.alt ?? "",
        action: item.action || "order",
        enabled: item.enabled,
      },
      "orderStrip",
      i
    )
  );
}

function normalizeParsedConfig(parsed = {}) {
  return {
    ...DEFAULT_MENU_WEB_CONFIG,
    ...parsed,
    orderStrip: normalizeOrderStrip(parsed.orderStrip),
    features:
      Array.isArray(parsed.features) && parsed.features.length === 4
        ? parsed.features.map((f, i) => ({
            iconUrl: f.iconUrl || DEFAULT_MENU_WEB_CONFIG.features[i].iconUrl,
            title: f.title ?? DEFAULT_MENU_WEB_CONFIG.features[i].title,
            desc: f.desc ?? DEFAULT_MENU_WEB_CONFIG.features[i].desc,
            enabled: f.enabled !== false,
          }))
        : cloneDefaultFeatures(),
    promoSlides: normalizePromoSlides(parsed.promoSlides),
    campaignBanners: normalizeCampaignBanners(parsed.campaignBanners),
  };
}

export function parseMenuWebConfig(raw) {
  if (!raw) {
    return normalizeParsedConfig({});
  }
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return normalizeParsedConfig(parsed);
  } catch {
    return parseMenuWebConfig(null);
  }
}

export function serializeMenuWebConfig(config) {
  return JSON.stringify(config);
}

export function mergeMenuWebConfig(existingRaw, patch = {}) {
  const current = parseMenuWebConfig(existingRaw);
  const next = {
    ...current,
    ...patch,
  };
  if (patch.features) {
    next.features = patch.features.map((f, i) => ({
      iconUrl: f.iconUrl || current.features[i]?.iconUrl || DEFAULT_MENU_WEB_CONFIG.features[i].iconUrl,
      title: f.title ?? current.features[i]?.title ?? "",
      desc: f.desc ?? current.features[i]?.desc ?? "",
      enabled: f.enabled !== false,
    }));
  }
  if (patch.promoSlides) next.promoSlides = normalizePromoSlides(patch.promoSlides);
  if (patch.campaignBanners) next.campaignBanners = normalizeCampaignBanners(patch.campaignBanners);
  if (patch.orderStrip) next.orderStrip = normalizeOrderStrip(patch.orderStrip);
  return next;
}

function findBannerByKey(list, key) {
  if (!Array.isArray(list)) return null;
  const byId = list.find((item) => item.id === key);
  if (byId) return byId;
  const index = Number(key);
  if (!Number.isNaN(index) && list[index]) return list[index];
  return null;
}

function applyImageKey(config, key, url) {
  if (DIRECT_IMAGE_KEYS.has(key)) {
    config[key] = url;
    return;
  }

  let match = key.match(/^promoSlide-(.+)$/);
  if (match) {
    const slide = findBannerByKey(config.promoSlides, match[1]);
    if (slide) slide.imageUrl = url;
    return;
  }

  match = key.match(/^campaign-(.+)$/);
  if (match) {
    const banner = findBannerByKey(config.campaignBanners, match[1]);
    if (banner) banner.imageUrl = url;
    return;
  }

  match = key.match(/^feature-(\d+)$/);
  if (match) {
    const i = Number(match[1]);
    if (config.features[i]) config.features[i].iconUrl = url;
    return;
  }

  match = key.match(/^orderStrip-(.+)$/);
  if (match) {
    const item = findBannerByKey(config.orderStrip, match[1]);
    if (item) item.imageUrl = url;
  }
}

export function applyWebImageUploads(firmId, config, uploads = {}) {
  if (!uploads || typeof uploads !== "object") return config;
  const next = parseMenuWebConfig(config);
  for (const [key, payload] of Object.entries(uploads)) {
    if (!payload?.data || !payload?.mime) continue;
    const url = saveMenuWebImage(firmId, key, payload.data, payload.mime);
    applyImageKey(next, key, url);
  }
  return next;
}
