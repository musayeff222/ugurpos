import { Link, useLocation } from "react-router-dom";
import StitchIcon from "./StitchIcon";
import { useLocale } from "../../context/LocaleContext";
import { getLastBranchId, loadBranchCart } from "../../utils/qrMenuStorage";

export default function StitchBottomNav({ branchId, cartCount = 0, active = "home" }) {
  const { t } = useLocale();
  const location = useLocation();
  const activeBranchId = branchId || getLastBranchId();

  const onLanding = location.pathname === "/m";
  const onMenu = activeBranchId && location.pathname === `/m/branch/${activeBranchId}`;
  const onCart = location.pathname.includes("/cart");

  const storedCartCount =
    cartCount ||
    (activeBranchId ? loadBranchCart(activeBranchId).reduce((sum, line) => sum + line.qty, 0) : 0);

  const linkClass = (isActive) => `sf-bottom-nav__link${isActive ? " is-active" : ""}`;

  return (
    <nav className="sf-bottom-nav" aria-label="Mobile navigation">
      <div className="sf-bottom-nav__inner sf-bottom-nav__inner--3">
        <Link to="/m" className={linkClass(onLanding || active === "home")}>
          <StitchIcon name="home" filled={onLanding || active === "home"} />
          <span>{t("qr.nav.home")}</span>
        </Link>

        {activeBranchId ? (
          <Link to={`/m/branch/${activeBranchId}`} className={linkClass((active === "menu" || onMenu) && !onCart)}>
            <StitchIcon name="menu_book" filled={active === "menu" || onMenu} />
            <span>{t("qr.nav.menu")}</span>
          </Link>
        ) : (
          <span className="sf-bottom-nav__link is-disabled">
            <StitchIcon name="menu_book" />
            <span>{t("qr.nav.menu")}</span>
          </span>
        )}

        {activeBranchId ? (
          <Link to={`/m/branch/${activeBranchId}/cart`} className={`${linkClass(active === "cart" || onCart)} sf-bottom-nav__link--cart`}>
            <span className="sf-bottom-nav__icon-wrap">
              <StitchIcon name="shopping_cart" filled={active === "cart" || onCart} />
              {storedCartCount > 0 && <em>{storedCartCount}</em>}
            </span>
            <span>{t("qr.myCart")}</span>
          </Link>
        ) : (
          <span className="sf-bottom-nav__link is-disabled">
            <StitchIcon name="shopping_cart" />
            <span>{t("qr.myCart")}</span>
          </span>
        )}
      </div>
    </nav>
  );
}
