import { Link, useLocation } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";
import StitchIcon from "./StitchIcon";
import { useLocale } from "../../context/LocaleContext";
import { getLastBranchId, loadBranchCart } from "../../utils/qrMenuStorage";

export default function StitchAppBar({ firm, branchId, cartCount = 0 }) {
  const { t } = useLocale();
  const location = useLocation();
  const activeBranchId = branchId || getLastBranchId();
  const title = firm?.menuTitle || "Cigkofte";
  const logoUrl = firm?.logoUrl;

  const storedCartCount =
    cartCount ||
    (activeBranchId ? loadBranchCart(activeBranchId).reduce((sum, line) => sum + line.qty, 0) : 0);

  const cartPath = activeBranchId ? `/m/branch/${activeBranchId}/cart` : "/m";
  const menuPath = activeBranchId ? `/m/branch/${activeBranchId}` : "/m";

  const isHome = location.pathname === "/m";
  const isMenu = activeBranchId && location.pathname === `/m/branch/${activeBranchId}`;
  const isCart = location.pathname.includes("/cart");
  const isOrders =
    location.pathname === "/m/orders" || location.pathname.startsWith("/m/order/");

  return (
    <header className="sf-appbar">
      <div className="sf-appbar__inner">
        <Link to="/m" className="sf-appbar__brand">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="sf-appbar__logo" />
          ) : (
            <StitchIcon name="restaurant" className="sf-appbar__brand-icon" />
          )}
          <span className="sf-appbar__title">{title}</span>
        </Link>

        <nav className="sf-appbar__desktop-nav" aria-label="Desktop">
          <Link to="/m" className={isHome ? "is-active" : ""}>
            {t("qr.nav.home")}
          </Link>
          <Link to={menuPath} className={isMenu ? "is-active" : ""}>
            {t("qr.nav.menu")}
          </Link>
          <Link to="/m/orders" className={isOrders ? "is-active" : ""}>
            {t("qr.nav.orders")}
          </Link>
        </nav>

        <div className="sf-appbar__actions">
          <LanguageSwitcher compact />
          <Link to={cartPath} className="sf-appbar__cart" aria-label={t("qr.myCart")}>
            <StitchIcon name="shopping_basket" />
            {storedCartCount > 0 && <em>{storedCartCount}</em>}
          </Link>
        </div>
      </div>
    </header>
  );
}
