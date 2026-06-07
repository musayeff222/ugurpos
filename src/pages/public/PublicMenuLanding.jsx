import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import { useLocale } from "../../context/LocaleContext";
import { fetchPublicFirmMenu } from "../../utils/qrMenuPublic";
import "../../styles/public-qr-menu.css";

const LANG_KEY = "ugurpos_lang";

export default function PublicMenuLanding() {
  const navigate = useNavigate();
  const { t, setLang } = useLocale();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
      <header className="public-menu-header">
        <div className="public-menu-header__badge">{t("qr.badge")}</div>
        <h1>{firm.menuTitle}</h1>
        {firm.menuWelcome && <p>{firm.menuWelcome}</p>}
        <p className="public-menu-branch-tag">{t("qr.selectBranch")}</p>
      </header>

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
              <strong>
                #{branch.branchNo} {branch.name}
              </strong>
              {branch.address && <span>{branch.address}</span>}
              {!branch.menuAcceptOrders && <em>{t("qr.viewOnly")}</em>}
            </button>
          ))
        )}
      </div>
    </PublicQrShell>
  );
}
