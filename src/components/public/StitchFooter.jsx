import { useLocale } from "../../context/LocaleContext";
import QrSocialLinks from "./QrSocialLinks";
import StitchIcon from "./StitchIcon";

export default function StitchFooter({ firm }) {
  const { t } = useLocale();
  const title = firm?.menuTitle || t("qr.badge");
  const welcome = firm?.menuWelcome || t("qr.footerTagline");

  return (
    <footer className="sf-footer">
      <div className="sf-footer__inner">
        <div className="sf-footer__brand">
          <div className="sf-footer__brand-head">
            <StitchIcon name="restaurant" className="sf-footer__brand-icon" />
            <strong>{title}</strong>
          </div>
          <p>{welcome}</p>
          <QrSocialLinks social={firm?.social} variant="brand" className="sf-footer__social" />
        </div>
        <div className="sf-footer__col">
          <h4>{t("qr.footerMenu")}</h4>
          <ul>
            <li>{t("qr.nav.home")}</li>
            <li>{t("qr.nav.menu")}</li>
            <li>{t("qr.myCart")}</li>
            <li>{t("qr.nav.orders")}</li>
          </ul>
        </div>
        <div className="sf-footer__col">
          <h4>{t("qr.followUs")}</h4>
          <p>{t("qr.footerTagline")}</p>
        </div>
      </div>
      <div className="sf-footer__copy">© {new Date().getFullYear()} {title}</div>
    </footer>
  );
}
