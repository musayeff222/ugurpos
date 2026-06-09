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
        <div className="stitch-container">
          <div className="stitch-loading">{t("qr.loadingMenu")}</div>
        </div>
      </PublicQrShell>
    );
  }

  if (error || !data) {
    return (
      <PublicQrShell firm={data?.firm} navActive="home">
        <div className="stitch-container">
          <div className="stitch-alert stitch-alert--error">{error || t("qr.menuNotFound")}</div>
        </div>
      </PublicQrShell>
    );
  }

  const { firm, branches } = data;

  return (
    <PublicQrShell firm={firm} navActive="home">
      <div className="stitch-container">
        {locating && <div className="stitch-banner">{t("qr.locating")}</div>}
        {locError && <div className="stitch-banner stitch-banner--muted">{t("qr.locationDenied")}</div>}
        {nearest && !locating && (
          <div className="stitch-banner">
            {t("qr.nearestBranch", {
              name: `#${nearest.branch.branchNo} ${nearest.branch.name}`,
              km: nearest.distanceKm.toFixed(1),
            })}{" "}
            <button type="button" className="stitch-link-btn" onClick={() => navigate(`/m/branch/${nearest.branch.id}`)}>
              {t("qr.goToBranch")}
            </button>
          </div>
        )}

        <section className="stitch-features">
          <h2>{t("qr.landingFeaturesTitle")}</h2>
          <div className="stitch-features__grid">
            <article className="stitch-feature-card">
              <span className="stitch-feature-card__icon"><i className="fa fa-truck" /></span>
              <h3>{t("qr.featureDelivery")}</h3>
              <p>{t("qr.featureDeliveryDesc")}</p>
            </article>
            <article className="stitch-feature-card">
              <span className="stitch-feature-card__icon"><i className="fa fa-leaf" /></span>
              <h3>{t("qr.featureFresh")}</h3>
              <p>{t("qr.featureFreshDesc")}</p>
            </article>
            <article className="stitch-feature-card">
              <span className="stitch-feature-card__icon"><i className="fa fa-clock-o" /></span>
              <h3>{t("qr.featureTrack")}</h3>
              <p>{t("qr.featureTrackDesc")}</p>
            </article>
          </div>
        </section>

        <section className="stitch-section">
          <div className="stitch-section-head">
            <h2>{t("qr.selectBranch")}</h2>
            <p>{t("qr.footerTagline")}</p>
          </div>

          <div className="stitch-branch-grid">
            {branches.length === 0 ? (
              <div className="stitch-panel stitch-empty">{t("qr.noBranches")}</div>
            ) : (
              branches.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  className="stitch-branch-card"
                  onClick={() => navigate(`/m/branch/${branch.id}`)}
                >
                  <div className="stitch-branch-card__body">
                    <div className="stitch-branch-card__head">
                      <strong>
                        #{branch.branchNo} {branch.name}
                      </strong>
                      <span className={`stitch-pill ${branch.isOpen ? "is-open" : "is-closed"}`}>
                        {branch.isOpen ? t("qr.openNow") : t("qr.closedNow")}
                      </span>
                    </div>
                    {branch.address && <span>{branch.address}</span>}
                    <small>
                      {branch.openTime} – {branch.closeTime}
                    </small>
                    {!branch.menuAcceptOrders && <em>{t("qr.viewOnly")}</em>}
                  </div>
                  <i className="fa fa-chevron-right stitch-branch-card__arrow" />
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </PublicQrShell>
  );
}
