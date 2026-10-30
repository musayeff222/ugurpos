import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import LanguageSwitcher from "../public/LanguageSwitcher";
import { BRAND_NAME, DEFAULT_LOGO_URL } from "../../constants/brand";
import { useLocale } from "../../context/LocaleContext";
import { getLastBranchId, loadBranchCart } from "../../utils/qrMenuStorage";

export default function OsesSiteHeader({ firm }) {
  const { t } = useLocale();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const branchId = getLastBranchId();
  const logoUrl = firm?.logoUrl || DEFAULT_LOGO_URL;
  const title = firm?.menuTitle || BRAND_NAME;
  const cartCount = branchId ? loadBranchCart(branchId).reduce((sum, line) => sum + line.qty, 0) : 0;
  const cartPath = branchId ? `/m/branch/${branchId}/cart` : "/m";
  const menuPath = branchId ? `/m/branch/${branchId}` : "/m#mehsullar";

  const nav = [
    { label: t("qr.nav.products"), to: menuPath },
    { label: t("qr.nav.campaigns"), to: "/m#kampanyalar" },
    { label: t("qr.nav.branches"), to: "/m#subeler" },
    { label: t("qr.osesNavFranchise"), to: "/m#franchise" },
    { label: t("qr.nav.contact"), to: "/m#iletisim" },
  ];

  const isActive = (to) => {
    if (to.startsWith("/m/branch") && location.pathname.startsWith("/m/branch") && !location.pathname.includes("/cart")) {
      return true;
    }
    return false;
  };

  return (
    <header className="ps-header">
      <div className="ps-header__bar">
        <Link className="ps-brand" to="/m" onClick={() => setNavOpen(false)}>
          <img src={logoUrl} alt={title} />
          <span>{title}</span>
        </Link>

        <nav className={`ps-nav${navOpen ? " is-open" : ""}`}>
          {nav.map((item) =>
            item.to.includes("#") ? (
              <a key={item.label} href={item.to} onClick={() => setNavOpen(false)}>
                {item.label}
              </a>
            ) : (
              <Link
                key={item.label}
                className={isActive(item.to) ? "is-active" : ""}
                to={item.to}
                onClick={() => setNavOpen(false)}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="ps-header__actions">
          <LanguageSwitcher compact />
          {branchId ? (
            <Link className="ps-icon-btn" to={cartPath} aria-label={t("qr.myCart")}>
              <i className="fas fa-shopping-bag" />
              {cartCount > 0 && <b>{cartCount}</b>}
            </Link>
          ) : null}
          <Link className="ps-cta" to={menuPath} onClick={() => setNavOpen(false)}>
            {t("qr.orderNow")}
          </Link>
          <button type="button" className="ps-burger" aria-label="Menü" onClick={() => setNavOpen((v) => !v)}>
            <i className={`fas ${navOpen ? "fa-times" : "fa-bars"}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
