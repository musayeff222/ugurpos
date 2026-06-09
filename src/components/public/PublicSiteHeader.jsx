import { useLocale } from "../../context/LocaleContext";
import QrSocialLinks from "./QrSocialLinks";

export default function PublicSiteHeader({ firm }) {
  const { t } = useLocale();
  const logoUrl = firm?.logoUrl;
  const title = firm?.menuTitle || t("qr.badge");
  const welcome = firm?.menuWelcome;

  return (
    <header className="stitch-site-header">
      <div className="stitch-site-header__logo-wrap">
        {logoUrl ? (
          <img src={logoUrl} alt={title} className="stitch-site-header__logo" key={logoUrl} />
        ) : (
          <div className="stitch-site-header__logo-fallback" aria-hidden="true">
            <i className="fa fa-cutlery" />
          </div>
        )}
      </div>
      <h1 className="stitch-site-header__title">{title}</h1>
      {welcome && <p className="stitch-site-header__welcome">{welcome}</p>}
      <QrSocialLinks social={firm?.social} variant="brand" className="stitch-site-header__social" />
    </header>
  );
}
