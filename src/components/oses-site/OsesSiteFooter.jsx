import { Link } from "react-router-dom";
import { useLocale } from "../../context/LocaleContext";

function socialHref(type, value) {
  if (!value?.trim()) return null;
  const raw = value.trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  if (type === "instagram") return `https://instagram.com/${raw.replace(/^@/, "")}`;
  if (type === "facebook") return `https://facebook.com/${raw.replace(/^@/, "")}`;
  if (type === "tiktok") return `https://tiktok.com/@${raw.replace(/^@/, "")}`;
  return null;
}

export default function OsesSiteFooter({ firm }) {
  const { t } = useLocale();
  const social = firm?.social || {};
  const ig = socialHref("instagram", social.instagram);
  const fb = socialHref("facebook", social.facebook);
  const tt = socialHref("tiktok", social.tiktok);

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
            <img src="/oses/assets/images/oses-25yil.png" className="img-fluid" alt="" />
            <p className="phone">—</p>
            <p className="mail">
              <a href="mailto:info@cigkofte.az">info@cigkofte.az</a>
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
                {fb && (
                  <a href={fb} target="_blank" rel="noopener noreferrer">
                    <i className="fab fa-facebook-f" />
                  </a>
                )}
                {ig && (
                  <a href={ig} target="_blank" rel="noopener noreferrer">
                    <i className="fab fa-instagram" />
                  </a>
                )}
                {tt && (
                  <a href={tt} target="_blank" rel="noopener noreferrer">
                    <i className="fab fa-tiktok" />
                  </a>
                )}
              </p>
            </div>
            <div className="app">
              <a target="_blank" rel="noopener noreferrer" href="https://play.google.com/store">
                <img src="/oses/assets/images/google_play.svg" alt="Google Play" />
              </a>
              <a target="_blank" rel="noopener noreferrer" href="https://apps.apple.com/">
                <img src="/oses/assets/images/apple_store.svg" alt="App Store" />
              </a>
            </div>
          </div>
          <div className="col-12">
            <hr />
            <p className="text-center mb-0">
              © {new Date().getFullYear()} {firm?.menuTitle || "Cigkofte"} | {t("qr.osesCopyright")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
