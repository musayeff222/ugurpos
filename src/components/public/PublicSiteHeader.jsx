import { useLocale } from "../../context/LocaleContext";
import QrSocialLinks from "./QrSocialLinks";

export default function PublicSiteHeader({ firm }) {
  const { t } = useLocale();
  const logoUrl = firm?.logoUrl;
  const title = firm?.menuTitle || t("qr.badge");
  const welcome = firm?.menuWelcome;

  return (
    <header className="public-site-header">
      <div className="public-site-header__logo-wrap">
        {logoUrl ? (
          <img src={logoUrl} alt={title} className="public-site-header__logo" />
        ) : (
          <div className="public-site-header__logo-fallback" aria-hidden="true">
            <i className="fa fa-shopping-bag" />
          </div>
        )}
      </div>
      <h1 className="public-site-header__title">{title}</h1>
      {welcome && <p className="public-site-header__welcome">{welcome}</p>}
      <QrSocialLinks social={firm?.social} variant="brand" className="public-site-header__social" />
    </header>
  );
}
