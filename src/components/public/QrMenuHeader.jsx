import { useLocale } from "../../context/LocaleContext";

export default function QrMenuHeader({ firm, branch, showBack, onBack }) {
  const { t } = useLocale();
  const title = branch?.menuTitle || branch?.name || firm?.menuTitle || t("qr.badge");
  const welcome = branch?.menuWelcome || firm?.menuWelcome;
  const openTime = branch?.openTime || firm?.openTime;
  const closeTime = branch?.closeTime || firm?.closeTime;
  const isOpen = branch?.isOpen ?? firm?.isOpen ?? true;
  const logoUrl = firm?.logoUrl;

  return (
    <section className="public-hero">
      <div className="public-hero__glow" aria-hidden="true" />
      <div className="public-hero__inner">
        {showBack && (
          <button type="button" className="public-hero__back" onClick={onBack}>
            <i className="fa fa-arrow-left" /> {t("qr.changeBranch")}
          </button>
        )}

        <div className="public-hero__main">
          <div className="public-hero__copy">
            <span className="public-hero__eyebrow">{t("qr.badge")}</span>
            <h1>{title}</h1>
            {welcome && <p className="public-hero__welcome">{welcome}</p>}

            <div className="public-hero__chips">
              {(openTime || closeTime) && (
                <span className={`public-hero__chip ${isOpen ? "is-open" : "is-closed"}`}>
                  <i className="fa fa-clock-o" />
                  {openTime} – {closeTime}
                  <em>{isOpen ? t("qr.openNow") : t("qr.closedNow")}</em>
                </span>
              )}
              {branch && (
                <span className="public-hero__chip">
                  <i className="fa fa-map-marker" />
                  #{branch.branchNo} {branch.name}
                </span>
              )}
            </div>
          </div>

          {logoUrl && (
            <div className="public-hero__visual">
              <img src={logoUrl} alt="" className="public-hero__logo" />
            </div>
          )}
        </div>

        {branch?.address && (
          <p className="public-hero__address">
            <i className="fa fa-location-arrow" /> {branch.address}
          </p>
        )}

        {branch && !branch.menuAcceptOrders && (
          <div className="public-hero__alert">{t("qr.viewOnlyNotice")}</div>
        )}
        {branch && branch.menuAcceptOrders && !isOpen && (
          <div className="public-hero__alert">{t("qr.closedNotice")}</div>
        )}
      </div>
    </section>
  );
}
