import { Link } from "react-router-dom";
import { useLocale } from "../../context/LocaleContext";
import { BRAND_NAME } from "../../constants/brand";
import { getWebConfig } from "../../utils/menuWebConfig";
import QrSocialLinks from "../public/QrSocialLinks";

export default function OsesSiteFooter({ firm }) {
  const { t } = useLocale();
  const web = getWebConfig(firm);
  const social = firm?.social || {};
  const phone = web.contactPhone?.trim();
  const email = web.contactEmail?.trim();
  const copyright = web.copyrightSuffix?.trim() || t("qr.osesCopyright");

  const links = [
    { label: t("qr.nav.home"), href: "/m" },
    { label: t("qr.nav.products"), href: "/m#mehsullar" },
    { label: t("qr.nav.campaigns"), href: "/m#kampanyalar" },
    { label: t("qr.nav.branches"), href: "/m#subeler" },
    { label: t("qr.osesNavFranchise"), href: "/m#franchise" },
    { label: t("qr.nav.contact"), href: "/m#iletisim" },
  ];

  return (
    <footer className="ps-footer" id="iletisim">
      <div className="ps-wrap ps-footer__grid">
        <div>
          <p className="phone">{phone || "—"}</p>
          <p className="mail">
            {email ? <a href={`mailto:${email}`}>{email}</a> : <span>—</span>}
          </p>
          <div className="social">
            <p>
              {t("qr.osesSocialTitle")}
              <br />
              <QrSocialLinks social={social} variant="fab" className="oses-footer__social" />
            </p>
          </div>
        </div>
        <ul>
          {links.map((item) => (
            <li key={item.label}>
              {item.href.includes("#") ? <a href={item.href}>{item.label}</a> : <Link to={item.href}>{item.label}</Link>}
            </li>
          ))}
        </ul>
      </div>
      <p className="ps-wrap ps-footer__copy">
        © {new Date().getFullYear()} {firm?.menuTitle || BRAND_NAME} | {copyright}
      </p>
    </footer>
  );
}
