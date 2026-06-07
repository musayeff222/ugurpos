import LanguageSwitcher from "./LanguageSwitcher";
import QrSocialLinks from "./QrSocialLinks";
import { useLocale } from "../../context/LocaleContext";

export default function PublicQrShell({ firm, children }) {
  const { t } = useLocale();
  const social = firm?.social || {};

  return (
    <div className="public-menu-page">
      <div className="public-menu-toolbar">
        <LanguageSwitcher compact />
        {Object.values(social).some(Boolean) && (
          <div className="public-menu-toolbar__social">
            <span className="public-menu-toolbar__label">{t("qr.followUs")}</span>
            <QrSocialLinks social={social} />
          </div>
        )}
      </div>
      {children}
      {Object.values(social).some(Boolean) && (
        <footer className="public-menu-footer">
          <p>{t("qr.followUs")}</p>
          <QrSocialLinks social={social} className="qr-social-links--footer" />
        </footer>
      )}
    </div>
  );
}
