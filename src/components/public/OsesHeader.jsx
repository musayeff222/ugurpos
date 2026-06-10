import { Link, useLocation } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLocale } from "../../context/LocaleContext";
import { getLastBranchId, loadBranchCart } from "../../utils/qrMenuStorage";

export default function OsesHeader({ firm, branchId, cartCount = 0 }) {
  const { t } = useLocale();
  const location = useLocation();
  const activeBranchId = branchId || getLastBranchId();
  const title = firm?.menuTitle || "Cigkofte";
  const logoUrl = firm?.logoUrl;

  const menuPath = activeBranchId ? `/m/branch/${activeBranchId}` : "/m#subeler";
  const cartPath = activeBranchId ? `/m/branch/${activeBranchId}/cart` : "/m";
  const storedCartCount =
    cartCount ||
    (activeBranchId ? loadBranchCart(activeBranchId).reduce((sum, line) => sum + line.qty, 0) : 0);

  const isHome = location.pathname === "/m";
  const isMenu = activeBranchId && location.pathname === `/m/branch/${activeBranchId}`;
  const isCart = location.pathname.includes("/cart");

  const navClass = (active) => `oses-nav__link${active ? " is-active" : ""}`;

  return (
    <header className="oses-header">
      <div className="oses-header__topbar">
        <div className="oses-container oses-header__topbar-inner">
          <LanguageSwitcher compact />
          <Link to={cartPath} className="oses-header__cart">
            <i className="fa fa-shopping-cart" />
            {t("qr.myCart")}
            {storedCartCount > 0 && <em>{storedCartCount}</em>}
          </Link>
        </div>
      </div>

      <div className="oses-header__main">
        <div className="oses-container">
          <Link to="/m" className="oses-header__logo-wrap">
            {logoUrl ? (
              <img src={logoUrl} alt={title} className="oses-header__logo" key={logoUrl} />
            ) : (
              <span className="oses-header__logo-text">{title}</span>
            )}
          </Link>

          <nav className="oses-nav" aria-label="Ana menü">
            <Link to="/m" className={navClass(isHome)}>
              {t("qr.nav.home")}
            </Link>
            <Link to={menuPath} className={navClass(isMenu)}>
              {t("qr.nav.products")}
            </Link>
            <a href="/m#kampanyalar" className="oses-nav__link">
              {t("qr.nav.campaigns")}
            </a>
            <a href="/m#subeler" className="oses-nav__link">
              {t("qr.nav.branches")}
            </a>
            <a href="/m#iletisim" className="oses-nav__link">
              {t("qr.nav.contact")}
            </a>
            <Link to={cartPath} className={navClass(isCart)}>
              {t("qr.orderNow")}
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
