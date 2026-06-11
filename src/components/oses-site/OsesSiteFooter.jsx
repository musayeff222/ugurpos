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
    { label: t("qr.nav.home"), href: "/m", route: true },
    { label: t("qr.osesNavCorporate"), href: "/m", route: true },
    { label: t("qr.nav.products"), href: "/m", route: true },
    { label: t("qr.nav.campaigns"), href: "/m#kampanyalar" },
    { label: t("qr.nav.branches"), href: "/m#subeler" },
    { label: t("qr.osesNavMedia"), href: "/m#iletisim" },
    { label: t("qr.osesNavFranchise"), href: "/m#franchise" },
    { label: t("qr.nav.contact"), href: "/m#iletisim" },
  ];

  return (
    <footer id="iletisim">
      <div className="container">
        <div className="row">
          <div className="col-12 col-sm-3">
            {web.footerBadgeUrl ? (
              <img src={web.footerBadgeUrl} className="img-fluid" alt="" />
            ) : null}
            <p className="phone">{phone || "—"}</p>
            <p className="mail">
              {email ? (
                <a href={`mailto:${email}`}>{email}</a>
              ) : (
                <span>—</span>
              )}
            </p>
          </div>
          <div className="col-12 col-sm-9">
            <ul>
              {links.map((item) => (
                <li key={item.label}>
                  {item.route ? (
                    <Link to={item.href}>{item.label}</Link>
                  ) : (
                    <a href={item.href}>{item.label}</a>
                  )}
                </li>
              ))}
            </ul>
            <div className="social">
              <p>
                <span>{t("qr.osesSocialTitle")}</span>
                <br />
                <QrSocialLinks social={social} variant="brand" className="oses-footer__social" />
              </p>
            </div>
          </div>
          <div className="col-12">
            <hr />
            <p className="text-center mb-0">
              © {new Date().getFullYear()} {firm?.menuTitle || BRAND_NAME} | {copyright}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
