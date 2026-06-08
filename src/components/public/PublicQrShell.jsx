import { Link } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";
import QrSocialLinks from "./QrSocialLinks";
import { useLocale } from "../../context/LocaleContext";

export default function PublicQrShell({ firm, children }) {
  const { t } = useLocale();
  const social = firm?.social || {};
  const hasSocial = Object.values(social).some(Boolean);
  const brandTitle = firm?.menuTitle || t("qr.badge");
  const logoUrl = firm?.logoUrl;

  return (
    <div className="public-web-app">
      <header className="public-web-header">
        <div className="public-web-header__inner">
          <Link to="/m" className="public-web-brand">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="public-web-brand__logo" />
            ) : (
              <span className="public-web-brand__mark">
                <i className="fa fa-shopping-bag" />
              </span>
            )}
            <span className="public-web-brand__text">
              <strong>{brandTitle}</strong>
              <small>{t("qr.badge")}</small>
            </span>
          </Link>
          <div className="public-web-header__actions">
            {hasSocial && (
              <div className="public-web-header__social">
                <QrSocialLinks social={social} />
              </div>
            )}
            <LanguageSwitcher compact />
          </div>
        </div>
      </header>

      <div className={`public-web-body qr-theme-${firm?.theme || "classic"}`}>
        <div className="public-web-container">{children}</div>
        {hasSocial && (
          <footer className="public-web-footer">
            <p>{t("qr.followUs")}</p>
            <QrSocialLinks social={social} className="qr-social-links--footer" />
          </footer>
        )}
      </div>
    </div>
  );
}
