import { Link } from "react-router-dom";
import QrSocialLinks from "./QrSocialLinks";
import { useLocale } from "../../context/LocaleContext";

const DEFAULT_SOCIAL = {
  instagram: "cigkofte",
  tiktok: "cigkofte",
  whatsapp: "",
  facebook: "cigkofte",
};

function mergeSocial(social = {}) {
  const merged = { ...DEFAULT_SOCIAL, ...social };
  return {
    instagram: merged.instagram?.trim() || DEFAULT_SOCIAL.instagram,
    tiktok: merged.tiktok?.trim() || DEFAULT_SOCIAL.tiktok,
    whatsapp: merged.whatsapp?.trim() || "",
    facebook: merged.facebook?.trim() || DEFAULT_SOCIAL.facebook,
  };
}

export default function OsesFooter({ firm }) {
  const { t } = useLocale();
  const title = firm?.menuTitle || "Cigkofte";
  const social = mergeSocial(firm?.social);

  return (
    <footer className="oses-footer" id="iletisim">
      <div className="oses-container oses-footer__inner">
        <div className="oses-footer__brand">
          <strong>{title}</strong>
          <p>{firm?.menuWelcome || t("qr.footerTagline")}</p>
        </div>
        <div className="oses-footer__col">
          <h4>{t("qr.footerMenu")}</h4>
          <ul>
            <li><Link to="/m">{t("qr.nav.home")}</Link></li>
            <li><a href="/m#subeler">{t("qr.nav.branches")}</a></li>
            <li><a href="/m#kampanyalar">{t("qr.nav.campaigns")}</a></li>
          </ul>
        </div>
        <div className="oses-footer__col">
          <h4>{t("qr.followUs")}</h4>
          <p className="oses-footer__social-title">{t("qr.osesSocialTitle")}</p>
          <QrSocialLinks social={social} variant="brand" className="oses-footer__social" />
        </div>
      </div>
      <div className="oses-footer__copy">
        <div className="oses-container">
          © {new Date().getFullYear()} {title} | {t("qr.osesCopyright")}
        </div>
      </div>
    </footer>
  );
}
