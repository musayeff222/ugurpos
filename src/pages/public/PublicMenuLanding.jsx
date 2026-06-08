import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import PublicQrBottomNav from "../../components/public/PublicQrBottomNav";
import QrMenuHeader from "../../components/public/QrMenuHeader";
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
    setLocating(true);
    requestUserLocation()
      .then(({ lat, lng }) => {
        const match = findNearestBranch(data.branches, lat, lng);
        if (match && match.distanceKm <= AUTO_RADIUS_KM) {
          setNearest(match);
          navigate(`/m/branch/${match.branch.id}`, { replace: true });
        } else if (match) {
          setNearest(match);
        }
      })
      .catch(() => setLocError(t("qr.locationDenied")))
      .finally(() => setLocating(false));
  }, [data, navigate, t]);

  if (loading) {
    return (
      <PublicQrShell firm={data?.firm}>
        <div className="public-menu-loading">{t("qr.loadingMenu")}</div>
      </PublicQrShell>
    );
  }

  if (error || !data) {
    return (
      <PublicQrShell firm={data?.firm}>
        <div className="public-menu-error card">{error || t("qr.menuNotFound")}</div>
      </PublicQrShell>
    );
  }

  const { firm, branches } = data;

  return (
    <PublicQrShell firm={firm}>
      <QrMenuHeader firm={firm} />

      {locating && <div className="public-menu-locate-banner">{t("qr.locating")}</div>}
      {locError && <div className="public-menu-locate-banner public-menu-locate-banner--muted">{locError}</div>}
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

      <p className="public-menu-branch-tag">{t("qr.selectBranch")}</p>

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
            </button>
          ))
        )}
      </div>

      <PublicQrBottomNav />
    </PublicQrShell>
  );
}
