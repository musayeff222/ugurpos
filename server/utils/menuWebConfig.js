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

const DIRECT_IMAGE_KEYS = new Set([
  "footerBadgeUrl",
  "lezzetlerImageUrl",
  "franchiseBackgroundUrl",
  "franchiseIconUrl",
]);

function cloneDefaultFeatures() {
  return DEFAULT_MENU_WEB_CONFIG.features.map((f) => ({ ...f }));
}

function cloneDefaultSlides(key) {
  return DEFAULT_MENU_WEB_CONFIG[key].map((s) => ({ ...s }));
}

function normalizeOrderStrip(raw) {
  const defaults = cloneDefaultSlides("orderStrip");
  if (!Array.isArray(raw) || raw.length === 0) return defaults;
  return defaults.map((item, i) => ({
    imageUrl: raw[i]?.imageUrl || item.imageUrl,
    alt: raw[i]?.alt ?? item.alt,
    action: raw[i]?.action || item.action || "order",
  }));
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
          }))
        : cloneDefaultFeatures(),
    promoSlides:
      Array.isArray(parsed.promoSlides) && parsed.promoSlides.length > 0
        ? parsed.promoSlides
        : cloneDefaultSlides("promoSlides"),
    campaignBanners:
      Array.isArray(parsed.campaignBanners) && parsed.campaignBanners.length > 0
        ? parsed.campaignBanners
        : cloneDefaultSlides("campaignBanners"),
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
    }));
  }
  if (patch.promoSlides) next.promoSlides = patch.promoSlides;
  if (patch.campaignBanners) next.campaignBanners = patch.campaignBanners;
  if (patch.orderStrip) next.orderStrip = normalizeOrderStrip(patch.orderStrip);
  return next;
}

function applyImageKey(config, key, url) {
  if (DIRECT_IMAGE_KEYS.has(key)) {
    config[key] = url;
    return;
  }

  let match = key.match(/^promoSlide-(\d+)$/);
  if (match) {
    const i = Number(match[1]);
    if (config.promoSlides[i]) config.promoSlides[i].imageUrl = url;
    return;
  }

  match = key.match(/^campaign-(\d+)$/);
  if (match) {
    const i = Number(match[1]);
    if (config.campaignBanners[i]) config.campaignBanners[i].imageUrl = url;
    return;
  }

  match = key.match(/^feature-(\d+)$/);
  if (match) {
    const i = Number(match[1]);
    if (config.features[i]) config.features[i].iconUrl = url;
    return;
  }

  match = key.match(/^orderStrip-(\d+)$/);
  if (match) {
    const i = Number(match[1]);
    if (config.orderStrip[i]) config.orderStrip[i].imageUrl = url;
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
