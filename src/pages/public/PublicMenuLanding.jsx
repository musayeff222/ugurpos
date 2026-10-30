import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import OsesPromoSlider from "../../components/oses-site/OsesPromoSlider";
import OsesSingleProduct from "../../components/oses-site/OsesSingleProduct";
import { useLocale } from "../../context/LocaleContext";
import { findNearestBranch, requestUserLocation } from "../../utils/geo";
import {
  fetchPublicBranchMenu,
  fetchPublicFirmMenu,
  getPublicProductImageSrc,
} from "../../utils/qrMenuPublic";
import { getBranchLabel } from "../../utils/branchDisplay";
import { formatPublicMoney } from "../../utils/publicMoney";
import { getWebConfig, isWebItemEnabled } from "../../utils/menuWebConfig";

const LANG_KEY = "ugurpos_lang";
const AUTO_RADIUS_KM = 80;

function BannerLink({ item, goOrder, children }) {
  if (item?.action === "branches") {
    return (
      <a href="#subeler" className="ps-banner">
        {children}
      </a>
    );
  }
  if (item?.action === "campaigns") {
    return (
      <a href="#kampanyalar" className="ps-banner">
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={() => goOrder()}>
      {children}
    </button>
  );
}

export default function PublicMenuLanding() {
  const navigate = useNavigate();
  const { t, setLang } = useLocale();
  const [data, setData] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [nearest, setNearest] = useState(null);
  const [search, setSearch] = useState("");
  const geoAttemptRef = useRef(false);

  useEffect(() => {
    fetchPublicFirmMenu()
      .then((payload) => {
        setData(payload);
        if (typeof window !== "undefined" && !localStorage.getItem(LANG_KEY) && payload.firm?.defaultLang) {
          setLang(payload.firm.defaultLang === "tr" ? "tr" : "az");
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [setLang]);

  useEffect(() => {
    if (!data?.branches?.length) return;
    const branch = data.branches.find((b) => b.menuAcceptOrders) || data.branches[0];
    fetchPublicBranchMenu(branch.id).then(setPreview).catch(() => {});
  }, [data]);

  useEffect(() => {
    if (!data?.branches?.length || geoAttemptRef.current) return;
    geoAttemptRef.current = true;
    let cancelled = false;
    requestUserLocation()
      .then(({ lat, lng }) => {
        if (cancelled) return;
        const match = findNearestBranch(data.branches, lat, lng);
        if (match && match.distanceKm <= AUTO_RADIUS_KM) setNearest(match);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [data]);

  const filteredBranches = useMemo(() => {
    if (!data?.branches) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.branches;
    return data.branches.filter(
      (b) =>
        b.name?.toLowerCase().includes(q) ||
        b.address?.toLowerCase().includes(q) ||
        String(b.branchNo).includes(q)
    );
  }, [data, search]);

  const firm = data?.firm;
  const web = getWebConfig(firm);
  const welcome = web.franchiseText?.trim() || firm?.menuWelcome || t("qr.osesFranchiseText");
  const orderStripItems = useMemo(
    () => (web.orderStrip || []).filter((item) => item.imageUrl && isWebItemEnabled(item)),
    [web.orderStrip]
  );
  const previewBranchId = preview?.branch?.id;
  const money = (v) => formatPublicMoney(v);

  const goBranch = (id) => navigate(`/m/branch/${id}`);
  const goOrder = () => {
    const b = nearest?.branch || filteredBranches[0];
    if (b) goBranch(b.id);
    else document.getElementById("subeler")?.scrollIntoView({ behavior: "smooth" });
  };
  const goBranches = () => document.getElementById("subeler")?.scrollIntoView({ behavior: "smooth" });

  if (loading) {
    return (
      <PublicQrShell firm={firm}>
        <div className="ps-loading">{t("qr.loadingMenu")}</div>
      </PublicQrShell>
    );
  }

  if (error || !data) {
    return (
      <PublicQrShell firm={firm}>
        <div className="ps-empty">{error || t("qr.menuNotFound")}</div>
      </PublicQrShell>
    );
  }

  return (
    <PublicQrShell firm={firm}>
      {web.showPromoSlider !== false && (
        <OsesPromoSlider slides={web.promoSlides} onOrder={goOrder} onBranches={goBranches} />
      )}

      {nearest?.branch && (
        <div className="ps-nearest">
          <p>
            {t("qr.nearestBranch", {
              name: getBranchLabel(nearest.branch),
              km: Number(nearest.distanceKm).toFixed(1),
            })}
          </p>
          <button type="button" className="ps-btn" onClick={() => goBranch(nearest.branch.id)}>
            {t("qr.goToBranch")}
          </button>
        </div>
      )}

      {web.showOrderStrip && orderStripItems.length > 0 && (
        <section className="ps-section">
          <div className="ps-wrap">
            <div className={`ps-banners${orderStripItems.length >= 3 ? " ps-banners--3" : ""}`}>
              {orderStripItems.slice(0, 3).map((item, i) => (
                <BannerLink key={item.id || `strip-${i}`} item={item} goOrder={goOrder}>
                  <img src={item.imageUrl} alt={item.alt || ""} />
                </BannerLink>
              ))}
            </div>
          </div>
        </section>
      )}

      {web.showCampaigns !== false &&
        web.campaignBanners.some((banner) => banner.imageUrl && isWebItemEnabled(banner)) && (
          <section className="ps-section" id="kampanyalar">
            <div className="ps-wrap">
              <h2>{t("qr.nav.campaigns")}</h2>
              <p className="ps-section__lead">{t("qr.heroHint")}</p>
              <div className="ps-banners">
                {web.campaignBanners.map((banner, i) =>
                  banner.imageUrl && isWebItemEnabled(banner) ? (
                    <button type="button" key={banner.id || `${banner.imageUrl}-${i}`} onClick={goOrder}>
                      <img src={banner.imageUrl} alt={banner.alt || ""} />
                    </button>
                  ) : null
                )}
              </div>
            </div>
          </section>
        )}

      {preview?.products?.length > 0 && previewBranchId && (
        <section className="ps-section" id="mehsullar">
          <div className="ps-wrap">
            <h2>{t("qr.nav.products")}</h2>
            <p className="ps-section__lead">{t("qr.osesSlide1Sub")}</p>
            <div className="ps-products">
              {preview.products.map((product) => (
                <OsesSingleProduct
                  key={product.id}
                  product={product}
                  imageSrc={getPublicProductImageSrc(previewBranchId, product)}
                  priceLabel={money(product.price1)}
                  canOrder={preview.branch?.menuAcceptOrders && preview.branch?.isOpen !== false}
                  onAdd={() => goBranch(previewBranchId)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {web.showFeatures !== false && web.features.some(isWebItemEnabled) && (
        <section className="ps-section">
          <div className="ps-wrap">
            <div className="ps-features">
              {web.features.filter(isWebItemEnabled).map((card) => (
                <article className="ps-feature" key={card.title}>
                  {card.iconUrl ? <img src={card.iconUrl} alt="" /> : null}
                  <h3>{card.title}</h3>
                  <p>{card.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {web.showFranchise && (
        <section className="ps-section" id="franchise">
          <div className="ps-wrap">
            <div
              className="ps-franchise"
              style={web.franchiseBackgroundUrl ? { backgroundImage: `url(${web.franchiseBackgroundUrl})` } : undefined}
            >
              <h2>
                {web.franchiseTitle1}
                <br />
                {web.franchiseTitle2}
              </h2>
              <h3>{web.franchiseSubtitle}</h3>
              <p>{welcome}</p>
              <button type="button" className="ps-btn" onClick={goOrder}>
                {t("qr.osesOrderNow")}
              </button>
            </div>
          </div>
        </section>
      )}

      {web.showLezzetlerBanner && web.lezzetlerImageUrl && (
        <section className="ps-section">
          <div className="ps-wrap">
            <a href="#subeler" className="ps-banner-wide">
              <img src={web.lezzetlerImageUrl} alt={t("qr.osesLezzetleri")} />
            </a>
          </div>
        </section>
      )}

      <section className="ps-section" id="subeler">
        <div className="ps-wrap">
          <h2>{t("qr.nav.branches")}</h2>
          <p className="ps-section__lead">{t("qr.selectBranch")}</p>
          <input
            className="ps-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("qr.searchBranch")}
          />
          <div className="ps-branches">
            {filteredBranches.map((branch) => (
              <button type="button" className="ps-branch" key={branch.id} onClick={() => goBranch(branch.id)}>
                <h3>{getBranchLabel(branch)}</h3>
                {branch.address ? <p>{branch.address}</p> : null}
                <p>
                  {branch.openTime} – {branch.closeTime}
                </p>
                <span className={`ps-pill${branch.isOpen ? "" : " is-closed"}`}>
                  {branch.isOpen ? t("qr.openNow") : t("qr.closedNow")}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </PublicQrShell>
  );
}
