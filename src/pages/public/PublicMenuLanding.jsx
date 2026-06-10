import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import OsesHeroSlider from "../../components/public/OsesHeroSlider";
import OsesOrderStrip from "../../components/public/OsesOrderStrip";
import { useLocale } from "../../context/LocaleContext";
import { findNearestBranch, requestUserLocation } from "../../utils/geo";
import {
  fetchPublicBranchMenu,
  fetchPublicFirmMenu,
  getPublicProductImageSrc,
} from "../../utils/qrMenuPublic";
import { ANNIVERSARY_BADGE, CAMPAIGN_BANNERS, FEATURE_BOXES, LEZZETLER_BANNER } from "../../utils/cigkofteSiteImages";
import { formatPublicMoney } from "../../utils/publicMoney";
import "../../styles/public-qr-menu.css";

const LANG_KEY = "ugurpos_lang";
const AUTO_RADIUS_KM = 80;

export default function PublicMenuLanding() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useLocale();
  const [data, setData] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [nearest, setNearest] = useState(null);
  const [locError, setLocError] = useState("");
  const [search, setSearch] = useState("");
  const geoAttemptRef = useRef(false);

  useEffect(() => {
    setLoading(true);
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
    fetchPublicBranchMenu(branch.id)
      .then(setPreview)
      .catch(() => {});
  }, [data]);

  useEffect(() => {
    if (!data?.branches?.length || geoAttemptRef.current) return;
    geoAttemptRef.current = true;

    let cancelled = false;
    setLocating(true);
    requestUserLocation()
      .then(({ lat, lng }) => {
        if (cancelled) return;
        const match = findNearestBranch(data.branches, lat, lng);
        if (match && match.distanceKm <= AUTO_RADIUS_KM) {
          setNearest(match);
          navigate(`/m/branch/${match.branch.id}`, { replace: true });
        } else if (match) {
          setNearest(match);
        }
      })
      .catch(() => {
        if (!cancelled) setLocError("denied");
      })
      .finally(() => {
        if (!cancelled) setLocating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [data, navigate]);

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

  const popularProducts = useMemo(() => {
    if (!preview?.products?.length) return [];
    return preview.products;
  }, [preview]);

  const previewBranchId = preview?.branch?.id;
  const money = (v) => formatPublicMoney(v);
  const firm = data?.firm;
  const welcome = firm?.menuWelcome || t("qr.heroSubtitle");

  const goBranch = (branchId) => navigate(`/m/branch/${branchId}`);
  const goOrder = () => {
    const branch = nearest?.branch || filteredBranches[0];
    if (branch) goBranch(branch.id);
    else document.getElementById("subeler")?.scrollIntoView({ behavior: "smooth" });
  };
  const goMenu = () => {
    if (previewBranchId) goBranch(previewBranchId);
    else goOrder();
  };
  const goBranches = () => document.getElementById("subeler")?.scrollIntoView({ behavior: "smooth" });
  const goCampaigns = () => document.getElementById("kampanyalar")?.scrollIntoView({ behavior: "smooth" });

  if (loading) {
    return (
      <PublicQrShell firm={firm} navActive="home">
        <div className="oses-container">
          <div className="oses-loading">{t("qr.loadingMenu")}</div>
        </div>
      </PublicQrShell>
    );
  }

  if (error || !data) {
    return (
      <PublicQrShell firm={firm} navActive="home">
        <div className="oses-container">
          <div className="oses-alert">{error || t("qr.menuNotFound")}</div>
        </div>
      </PublicQrShell>
    );
  }

  return (
    <PublicQrShell firm={firm} navActive="home">
      <OsesHeroSlider onOrder={goOrder} onMenu={goMenu} />

      <OsesOrderStrip
        onOrder={goOrder}
        onMenu={goMenu}
        onBranches={goBranches}
        onCampaigns={goCampaigns}
      />

      <div className="oses-container">
        {locating && <div className="oses-banner">{t("qr.locating")}</div>}
        {locError && <div className="oses-banner oses-banner--muted">{t("qr.locationDenied")}</div>}
        {nearest && !locating && (
          <div className="oses-banner">
            {t("qr.nearestBranch", {
              name: `#${nearest.branch.branchNo} ${nearest.branch.name}`,
              km: nearest.distanceKm.toFixed(1),
            })}{" "}
            <button type="button" className="oses-link-btn" onClick={() => goBranch(nearest.branch.id)}>
              {t("qr.goToBranch")}
            </button>
          </div>
        )}
      </div>

      {/* Özellik kutuları */}
      <section className="oses-section oses-section--gray">
        <div className="oses-container">
          <div className="oses-section__head">
            <h2>{t("qr.landingFeaturesTitle")}</h2>
            <p>{welcome}</p>
          </div>
          <div className="oses-features">
            {FEATURE_BOXES.map((item) => (
              <article key={item.titleKey} className={`oses-feature-box${item.icon ? " oses-feature-box--icon" : ""}`}>
                <div className="oses-feature-box__img">
                  <img src={item.image} alt={t(item.titleKey)} loading="lazy" />
                </div>
                <div className="oses-feature-box__body">
                  <h3>{t(item.titleKey)}</h3>
                  <p>{t(item.descKey)}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Kampanyalar */}
      <section className="oses-section" id="kampanyalar">
        <div className="oses-container">
          <div className="oses-section__head">
            <h2>{t("qr.nav.campaigns")}</h2>
            <p>{t("qr.campaignsTitle")}</p>
          </div>
          <div className="oses-campaigns__grid">
            {CAMPAIGN_BANNERS.map((banner) => (
              <article key={banner.image} className="oses-campaign-banner">
                <img src={banner.image} alt={t(banner.titleKey)} loading="lazy" />
                <div className="oses-campaign-banner__overlay">
                  <span className="oses-campaign-banner__tag">{t(banner.tagKey)}</span>
                  <h3>{t(banner.titleKey)}</h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Lezzetler geniş banner — oses.com.tr */}
      <section className="oses-lezzetler">
        <img src={LEZZETLER_BANNER} alt={t("qr.osesLezzetleri")} loading="lazy" />
        <div className="oses-lezzetler__badge">
          <img src={ANNIVERSARY_BADGE} alt="" loading="lazy" aria-hidden="true" />
        </div>
      </section>

      {/* Tüm ürünler — kategori kartları */}
      {preview?.products?.length > 0 && previewBranchId && (
        <section className="oses-section">
          <div className="oses-container">
            <div className="oses-section__head">
              <h2>{t("qr.categoriesTitle")}</h2>
              <p>{t("qr.popularFlavors")}</p>
            </div>
            <div className="oses-category-grid">
              {preview.products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="oses-category-card"
                  onClick={() => goBranch(previewBranchId)}
                >
                  <img src={getPublicProductImageSrc(previewBranchId, product)} alt={product.name} loading="lazy" />
                  <span>{product.name}</span>
                  <em>{money(product.price1)}</em>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Ürünler */}
      {popularProducts.length > 0 && previewBranchId && (
        <section className="oses-section oses-section--gray">
          <div className="oses-container">
            <div className="oses-section__head">
              <h2>{t("qr.nav.products")}</h2>
              <p>{t("qr.popularTitle")}</p>
            </div>
            <div className="oses-products__grid">
              {popularProducts.map((product) => (
                <article key={product.id} className="oses-product-card">
                  <div className="oses-product-card__img">
                    <img src={getPublicProductImageSrc(previewBranchId, product)} alt={product.name} />
                  </div>
                  <div className="oses-product-card__body">
                    <h3>{product.name}</h3>
                    <p className="oses-product-card__price">{money(product.price1)}</p>
                    <button type="button" className="oses-product-card__btn" onClick={() => goBranch(previewBranchId)}>
                      {t("qr.orderNow")}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <button type="button" className="oses-btn oses-btn--primary" onClick={() => goBranch(previewBranchId)}>
                {t("qr.viewAll")}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Şubeler */}
      <section className="oses-section" id="subeler">
        <div className="oses-container">
          <div className="oses-section__head">
            <h2>{t("qr.nav.branches")}</h2>
            <p>{t("qr.selectBranch")}</p>
          </div>
          <div className="oses-branches__search">
            <i className="fa fa-search" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("qr.searchBranch")}
            />
          </div>
          <div className="oses-branches__list">
            {filteredBranches.length === 0 ? (
              <p className="oses-loading">{t("qr.noBranches")}</p>
            ) : (
              filteredBranches.map((branch) => (
                <button key={branch.id} type="button" className="oses-branch-row" onClick={() => goBranch(branch.id)}>
                  <div className="oses-branch-row__head">
                    <strong>
                      #{branch.branchNo} {branch.name}
                    </strong>
                    <span className={`oses-pill ${branch.isOpen ? "is-open" : "is-closed"}`}>
                      {branch.isOpen ? t("qr.openNow") : t("qr.closedNow")}
                    </span>
                  </div>
                  {branch.address && <p>{branch.address}</p>}
                  <div className="oses-branch-row__meta">
                    <span>
                      <i className="fa fa-clock-o" /> {branch.openTime} – {branch.closeTime}
                    </span>
                    {!branch.menuAcceptOrders && <em>{t("qr.viewOnly")}</em>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </section>
    </PublicQrShell>
  );
}
