/** Site görselleri — OSES (oses.com.tr) + Cigkofte ürün fotoğrafları */

const OSES = "/images/oses";

/** oses.com.tr ana sayfa görselleri */
export const OSES_IMAGES = {
  promo1: `${OSES}/photos__promo__promo-1.jpg`,
  promo2: `${OSES}/photos__promo__promo-2.jpg`,
  promo3: `${OSES}/photos__promo__promo-3.jpg`,
  tatliSeverler: `${OSES}/photos__onecikanlar__tatli-severler.jpg`,
  mutluluk: `${OSES}/photos__onecikanlar__mutluluga-doyma-zamani.jpg`,
  yemeksepeti: `${OSES}/assets__images__oses-yemeksepeti.jpg`,
  getir: `${OSES}/assets__images__oses-getir.jpg`,
  hemenSiparis: `${OSES}/assets__images__hemen_siparis_ver.png`,
  enYakin: `${OSES}/assets__images__en_yakin_oses.png`,
  kampanyalar: `${OSES}/assets__images__kampanyalar.png`,
  icoBayilik: `${OSES}/assets__images__ico_bayilik.png`,
  icoKalite: `${OSES}/assets__images__ico_kalite.png`,
  icoGida: `${OSES}/assets__images__ico_gida-guvenligi.png`,
  icoTuketici: `${OSES}/assets__images__ico_tuketici.png`,
  lezzetleri: `${OSES}/assets__images__oses-lezzetleri.jpg`,
  yil25: `${OSES}/assets__images__oses-25yil.png`,
  logoMark: `${OSES}/assets__images__oses.png`,
};

/** Çiğköfte ürün fotoğrafları */
export const CIGKOFTe_IMAGES = {
  durum100: "/images/cigkofte/durum-100gr.jpg",
  specialDurum: "/images/cigkofte/special-durum-159gr.jpg",
  porsiyon250: "/images/cigkofte/porsiyon-250gr.jpg",
  gram500: "/images/cigkofte/cigkofte-500gr.jpg",
  gram750: "/images/cigkofte/cigkofte-750gr.jpg",
  gram1kg: "/images/cigkofte/cigkofte-1kg.jpg",
};

const STOCK_TO_IMAGE = {
  "CKF-DURUM-100": CIGKOFTe_IMAGES.durum100,
  "CKF-SPECIAL-159": CIGKOFTe_IMAGES.specialDurum,
  "CKF-PORS-250": CIGKOFTe_IMAGES.porsiyon250,
  "CKF-500": CIGKOFTe_IMAGES.gram500,
  "CKF-750": CIGKOFTe_IMAGES.gram750,
  "CKF-1000": CIGKOFTe_IMAGES.gram1kg,
};

const BARCODE_TO_IMAGE = {
  "8690000100001": CIGKOFTe_IMAGES.durum100,
  "8690000100002": CIGKOFTe_IMAGES.specialDurum,
  "8690000100003": CIGKOFTe_IMAGES.porsiyon250,
  "8690000100004": CIGKOFTe_IMAGES.gram500,
  "8690000100005": CIGKOFTe_IMAGES.gram750,
  "8690000100006": CIGKOFTe_IMAGES.gram1kg,
};

/** Hero slider — oses.com.tr promo görselleri */
export const HERO_SLIDES = [
  {
    image: OSES_IMAGES.promo1,
    titleKey: "qr.osesHeroEyebrow",
    subtitleKey: "qr.osesSlide1Sub",
  },
  {
    image: OSES_IMAGES.promo2,
    titleKey: "qr.osesSlide2",
    subtitleKey: "qr.osesSlide2Sub",
  },
  {
    image: OSES_IMAGES.promo3,
    titleKey: "qr.osesSlide3",
    subtitleKey: "qr.osesSlide3Sub",
  },
];

/** Sipariş şeridi — oses.com.tr buton görselleri */
export const ORDER_STRIP_BUTTONS = [
  { image: OSES_IMAGES.yemeksepeti, altKey: "qr.osesOrderYemeksepeti", action: "order" },
  { image: OSES_IMAGES.getir, altKey: "qr.osesOrderGetir", action: "menu" },
  { image: OSES_IMAGES.hemenSiparis, altKey: "qr.osesOrderNow", action: "order" },
  { image: OSES_IMAGES.enYakin, altKey: "qr.osesNearest", action: "branches" },
  { image: OSES_IMAGES.kampanyalar, altKey: "qr.nav.campaigns", action: "campaigns" },
];

/** Özellik kutuları — oses.com.tr ikonları */
export const FEATURE_BOXES = [
  { image: OSES_IMAGES.icoBayilik, titleKey: "qr.osesFeatureBayilik", descKey: "qr.osesFeatureBayilikDesc", icon: true },
  { image: OSES_IMAGES.icoKalite, titleKey: "qr.osesFeatureQuality", descKey: "qr.osesFeatureQualityDesc", icon: true },
  { image: OSES_IMAGES.icoGida, titleKey: "qr.osesFeatureSafety", descKey: "qr.osesFeatureSafetyDesc", icon: true },
  { image: OSES_IMAGES.icoTuketici, titleKey: "qr.osesFeatureHappy", descKey: "qr.osesFeatureHappyDesc", icon: true },
];

/** Kampanya banner'ları — oses.com.tr öne çıkanlar */
export const CAMPAIGN_BANNERS = [
  { image: OSES_IMAGES.tatliSeverler, tagKey: "qr.osesSlide3", titleKey: "qr.osesCampaignSweet" },
  { image: OSES_IMAGES.mutluluk, tagKey: "qr.heroBadge", titleKey: "qr.osesSlide2" },
];

export const LEZZETLER_BANNER = OSES_IMAGES.lezzetleri;
export const ANNIVERSARY_BADGE = OSES_IMAGES.yil25;
export const MENU_BANNER_IMAGE = OSES_IMAGES.promo1;

export function seedImageForProduct(product) {
  if (!product) return null;
  if (product.stockCode && STOCK_TO_IMAGE[product.stockCode]) {
    return STOCK_TO_IMAGE[product.stockCode];
  }
  if (product.barcode && BARCODE_TO_IMAGE[product.barcode]) {
    return BARCODE_TO_IMAGE[product.barcode];
  }
  return null;
}

export function resolveProductImageSrc(branchId, product) {
  if (product?.imageUrl) return product.imageUrl;
  const seed = seedImageForProduct(product);
  if (seed) return seed;
  if (!product?.id || !branchId) return null;
  return `/api/public/menu/branches/${encodeURIComponent(branchId)}/products/${product.id}/image`;
}
