import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import { useLocale } from "../../context/LocaleContext";
import { findNearestBranch, requestUserLocation } from "../../utils/geo";
import { fetchPublicFirmMenu } from "../../utils/qrMenuPublic";
import "../../styles/public-qr-menu.css";

const LANG_KEY = "ugurpos_lang";
const AUTO_RADIUS_KM = 80;

export default function PublicMenuLanding() {
  const navigate = useNavigate();
  const { t, setLang } = useLocale();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [nearest, setNearest] = useState(null);
  const [locError, setLocError] = useState("");
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

  if (loading) {
    return (
      <PublicQrShell firm={data?.firm} navActive="home">
        <div className="public-web-container">
          <div className="public-menu-loading">{t("qr.loadingMenu")}</div>
        </div>
      </PublicQrShell>
    );
  }

  if (error || !data) {
    return (
      <PublicQrShell firm={data?.firm} navActive="home">
        <div className="public-web-container">
          <div className="public-menu-error card">{error || t("qr.menuNotFound")}</div>
        </div>
      </PublicQrShell>
    );
  }

  const { firm, branches } = data;

  return (
    <PublicQrShell firm={firm} navActive="home">
      <div className="public-web-container">
        {locating && <div className="public-menu-locate-banner">{t("qr.locating")}</div>}
        {locError && (
          <div className="public-menu-locate-banner public-menu-locate-banner--muted">{t("qr.locationDenied")}</div>
        )}
        {nearest && !locating && (
          <div className="public-menu-locate-banner">
            {t("qr.nearestBranch", {
              name: `#${nearest.branch.branchNo} ${nearest.branch.name}`,
              km: nearest.distanceKm.toFixed(1),
            })}{" "}
            <button type="button" className="link-btn" onClick={() => navigate(`/m/branch/${nearest.branch.id}`)}>
              {t("qr.goToBranch")}
            </button>
          </div>
        )}

        <section className="public-landing-features">
          <h2>{t("qr.landingFeaturesTitle")}</h2>
          <div className="public-landing-features__grid">
            <article className="public-landing-feature card">
              <span className="public-landing-feature__icon"><i className="fa fa-truck" /></span>
              <h3>{t("qr.featureDelivery")}</h3>
              <p>{t("qr.featureDeliveryDesc")}</p>
            </article>
            <article className="public-landing-feature card">
              <span className="public-landing-feature__icon"><i className="fa fa-leaf" /></span>
              <h3>{t("qr.featureFresh")}</h3>
              <p>{t("qr.featureFreshDesc")}</p>
            </article>
            <article className="public-landing-feature card">
              <span className="public-landing-feature__icon"><i className="fa fa-clock-o" /></span>
              <h3>{t("qr.featureTrack")}</h3>
              <p>{t("qr.featureTrackDesc")}</p>
            </article>
          </div>
        </section>

        <section className="public-web-section">
          <div className="public-web-section__head">
            <h2>{t("qr.selectBranch")}</h2>
            <p>{t("qr.footerTagline")}</p>
          </div>

          <div className="public-branch-picker">
            {branches.length === 0 ? (
              <div className="card public-menu-empty-card">
                <p>{t("qr.noBranches")}</p>
              </div>
            ) : (
              branches.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  className="public-branch-picker__item"
                  onClick={() => navigate(`/m/branch/${branch.id}`)}
                >
                  <div className="public-branch-picker__content">
                    <div className="public-branch-picker__head">
                      <strong>
                        #{branch.branchNo} {branch.name}
                      </strong>
                      <span className={`public-branch-hours-pill ${branch.isOpen ? "open" : "closed"}`}>
                        {branch.isOpen ? t("qr.openNow") : t("qr.closedNow")}
                      </span>
                    </div>
                    {branch.address && <span>{branch.address}</span>}
                    <span className="public-branch-picker__hours">
                      {branch.openTime} – {branch.closeTime}
                    </span>
                    {!branch.menuAcceptOrders && <em>{t("qr.viewOnly")}</em>}
                  </div>
                  <span className="public-branch-picker__arrow" aria-hidden="true">
                    <i className="fa fa-chevron-right" />
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </PublicQrShell>
  );
}
