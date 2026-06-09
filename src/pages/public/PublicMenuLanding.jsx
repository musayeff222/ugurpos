import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import StitchIcon from "../../components/public/StitchIcon";
import StitchProductCard from "../../components/public/StitchProductCard";
import { useLocale } from "../../context/LocaleContext";
import { findNearestBranch, requestUserLocation } from "../../utils/geo";
import {
  fetchPublicBranchMenu,
  fetchPublicFirmMenu,
  getPublicProductImageSrc,
} from "../../utils/qrMenuPublic";
import { formatPublicMoney } from "../../utils/publicMoney";
import "../../styles/public-qr-menu.css";

const LANG_KEY = "ugurpos_lang";
const AUTO_RADIUS_KM = 80;

const CATEGORY_ICONS = ["wrap_text", "lunch_dining", "temp_preferences_custom", "local_drink"];

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
    return preview.products.slice(0, 6);
  }, [preview]);

  const previewBranchId = preview?.branch?.id;
  const money = (v) => formatPublicMoney(v);
  const firm = data?.firm;
  const welcome = firm?.menuWelcome || t("qr.heroSubtitle");

  if (loading) {
    return (
      <PublicQrShell firm={firm} navActive="home">
        <div className="sf-container">
          <div className="sf-loading">{t("qr.loadingMenu")}</div>
        </div>
      </PublicQrShell>
    );
  }

  if (error || !data) {
    return (
      <PublicQrShell firm={firm} navActive="home">
        <div className="sf-container">
          <div className="sf-alert">{error || t("qr.menuNotFound")}</div>
        </div>
      </PublicQrShell>
    );
  }

  const goBranch = (branchId) => navigate(`/m/branch/${branchId}`);

  return (
    <PublicQrShell firm={firm} navActive="home">
      {/* Desktop hero */}
      <section className="sf-hero sf-hero--desktop">
        <div className="sf-hero__bg" />
        <div className="sf-hero__content sf-container">
          <span className="sf-hero__pill">{t("qr.heroBadge")}</span>
          <h1 className="sf-hero__title">
            {t("qr.heroTitleLine1")}{" "}
            <span className="sf-text-gradient">{t("qr.heroTitleAccent1")}</span> {t("qr.heroTitleLine2")}{" "}
            <span className="sf-text-gradient">{t("qr.heroTitleAccent2")}</span>
          </h1>
          <p className="sf-hero__subtitle">{welcome}</p>
          <div className="sf-hero__actions">
            <button type="button" className="sf-btn-primary" onClick={() => filteredBranches[0] && goBranch(filteredBranches[0].id)}>
              {t("qr.orderNow")}
            </button>
            <button
              type="button"
              className="sf-btn-secondary"
              onClick={() => previewBranchId && goBranch(previewBranchId)}
            >
              <StitchIcon name="menu_book" />
              {t("qr.viewMenu")}
            </button>
          </div>
        </div>
      </section>

      <div className="sf-container sf-page-stack">
        {locating && <div className="sf-banner">{t("qr.locating")}</div>}
        {locError && <div className="sf-banner sf-banner--muted">{t("qr.locationDenied")}</div>}
        {nearest && !locating && (
          <div className="sf-banner">
            {t("qr.nearestBranch", {
              name: `#${nearest.branch.branchNo} ${nearest.branch.name}`,
              km: nearest.distanceKm.toFixed(1),
            })}{" "}
            <button type="button" className="sf-link-btn" onClick={() => goBranch(nearest.branch.id)}>
              {t("qr.goToBranch")}
            </button>
          </div>
        )}

        {/* Mobile location + search */}
        <section className="sf-home-tools sf-home-tools--mobile">
          <div className="sf-location-bar">
            <StitchIcon name="location_on" filled className="sf-location-bar__icon" />
            <span>{nearest?.branch?.address || filteredBranches[0]?.address || t("qr.selectBranch")}</span>
            <StitchIcon name="expand_more" />
          </div>
          <div className="sf-search">
            <StitchIcon name="search" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("qr.searchBranch")}
            />
          </div>
        </section>

        {/* Campaign strip (mobile) */}
        {welcome && (
          <section className="sf-campaigns sf-campaigns--mobile">
            <h2>{t("qr.campaignsTitle")}</h2>
            <div className="sf-campaigns__scroll">
              <article className="sf-campaign-card">
                <div className="sf-campaign-card__overlay">
                  <span className="sf-campaign-card__tag sf-campaign-card__tag--primary">{t("qr.heroBadge")}</span>
                  <h3>{welcome}</h3>
                </div>
              </article>
              <article className="sf-campaign-card sf-campaign-card--green">
                <div className="sf-campaign-card__overlay">
                  <span className="sf-campaign-card__tag sf-campaign-card__tag--green">{t("qr.featureFresh")}</span>
                  <h3>{t("qr.featureFreshDesc")}</h3>
                </div>
              </article>
            </div>
          </section>
        )}

        {/* Categories from preview groups */}
        {(preview?.groups || []).length > 0 && previewBranchId && (
          <section className="sf-categories">
            <h2>{t("qr.categoriesTitle")}</h2>
            <div className="sf-categories__grid">
              {preview.groups.slice(0, 4).map((group, i) => (
                <button
                  key={group.id}
                  type="button"
                  className="sf-category-tile"
                  onClick={() => goBranch(previewBranchId)}
                >
                  <span className={`sf-category-tile__icon ${i === 0 ? "is-accent" : ""}`}>
                    <StitchIcon name={CATEGORY_ICONS[i % CATEGORY_ICONS.length]} />
                  </span>
                  <span>{group.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Popular products preview */}
        {popularProducts.length > 0 && previewBranchId && (
          <section className="sf-popular">
            <div className="sf-section-head">
              <h2>{t("qr.popularTitle")}</h2>
              <button type="button" className="sf-link-btn" onClick={() => goBranch(previewBranchId)}>
                {t("qr.viewAll")}
              </button>
            </div>
            <div className="sf-popular__list">
              {popularProducts.map((product) => (
                <StitchProductCard
                  key={product.id}
                  layout="row"
                  product={product}
                  imageSrc={getPublicProductImageSrc(previewBranchId, product)}
                  priceLabel={money(product.price1)}
                  description={product.unit ? `${product.unit}` : undefined}
                  canOrder={preview.branch?.menuAcceptOrders && preview.branch?.isOpen !== false}
                  onAdd={() => goBranch(previewBranchId)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Branch picker — Stitch desktop map section style */}
        <section className="sf-branches-section">
          <div className="sf-branches-section__head">
            <h2>{t("qr.nearestBranchesTitle")}</h2>
            <p>{t("qr.selectBranch")}</p>
          </div>
          <div className="sf-branches-panel">
            <div className="sf-branches-panel__search">
              <StitchIcon name="search" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("qr.searchBranch")}
              />
            </div>
            <div className="sf-branches-list">
              {filteredBranches.length === 0 ? (
                <p className="sf-empty">{t("qr.noBranches")}</p>
              ) : (
                filteredBranches.map((branch) => (
                  <button key={branch.id} type="button" className="sf-branch-item" onClick={() => goBranch(branch.id)}>
                    <div className="sf-branch-item__head">
                      <strong>
                        #{branch.branchNo} {branch.name}
                      </strong>
                      <span className={`sf-pill ${branch.isOpen ? "is-open" : "is-closed"}`}>
                        {branch.isOpen ? t("qr.openNow") : t("qr.closedNow")}
                      </span>
                    </div>
                    {branch.address && <p>{branch.address}</p>}
                    <div className="sf-branch-item__meta">
                      <span>
                        <StitchIcon name="schedule" /> {branch.openTime} – {branch.closeTime}
                      </span>
                      {!branch.menuAcceptOrders && <em>{t("qr.viewOnly")}</em>}
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="sf-branches-panel__map" aria-hidden="true">
              <StitchIcon name="map" className="sf-branches-panel__map-icon" />
            </div>
          </div>
        </section>
      </div>
    </PublicQrShell>
  );
}
