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
    <header className="public-menu-header">
      {showBack && (
        <button type="button" className="public-menu-back" onClick={onBack}>
          ← {t("qr.changeBranch")}
        </button>
      )}
      <div className="public-menu-header__top">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="public-menu-logo" />
        ) : (
          <div className="public-menu-logo public-menu-logo--placeholder">
            <i className="fa fa-cutlery" />
          </div>
        )}
        <div className="public-menu-header__info">
          <div className="public-menu-header__badge">{t("qr.badge")}</div>
          <h1>{title}</h1>
          {welcome && <p>{welcome}</p>}
        </div>
      </div>
      {(openTime || closeTime) && (
        <div className={`public-menu-hours ${isOpen ? "is-open" : "is-closed"}`}>
          <i className="fa fa-clock-o" />
          <span>
            {openTime} – {closeTime}
          </span>
          <strong>{isOpen ? t("qr.openNow") : t("qr.closedNow")}</strong>
        </div>
      )}
      {branch && (
        <div className="public-menu-branch-tag">
          <i className="fa fa-map-marker" />
          {t("qr.orderBranch")}: <strong>#{branch.branchNo} {branch.name}</strong>
          {branch.address ? ` · ${branch.address}` : ""}
        </div>
      )}
      {branch && !branch.menuAcceptOrders && (
        <div className="public-menu-notice">{t("qr.viewOnlyNotice")}</div>
      )}
      {branch && branch.menuAcceptOrders && !isOpen && (
        <div className="public-menu-notice">{t("qr.closedNotice")}</div>
      )}
    </header>
  );
}
