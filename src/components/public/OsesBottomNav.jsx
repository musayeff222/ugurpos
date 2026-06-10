import { Link, useLocation } from "react-router-dom";
import { useLocale } from "../../context/LocaleContext";
import { getLastBranchId, loadBranchCart } from "../../utils/qrMenuStorage";

export default function OsesBottomNav({ branchId, cartCount = 0, active = "home" }) {
  const { t } = useLocale();
  const location = useLocation();
  const activeBranchId = branchId || getLastBranchId();

  const onLanding = location.pathname === "/m";
  const onMenu = activeBranchId && location.pathname === `/m/branch/${activeBranchId}`;
  const onCart = location.pathname.includes("/cart");

  const storedCartCount =
    cartCount ||
    (activeBranchId ? loadBranchCart(activeBranchId).reduce((sum, line) => sum + line.qty, 0) : 0);

  const linkClass = (isActive) => `oses-bottom-nav__link${isActive ? " is-active" : ""}`;

  return (
    <nav className="oses-bottom-nav" aria-label="Mobil menü">
      <div className="oses-bottom-nav__inner">
        <Link to="/m" className={linkClass(onLanding || active === "home")}>
          <i className="fa fa-home" />
          <span>{t("qr.nav.home")}</span>
        </Link>

        {activeBranchId ? (
          <Link to={`/m/branch/${activeBranchId}`} className={linkClass((active === "menu" || onMenu) && !onCart)}>
            <i className="fa fa-cutlery" />
            <span>{t("qr.nav.menu")}</span>
          </Link>
        ) : (
          <span className="oses-bottom-nav__link is-disabled">
            <i className="fa fa-cutlery" />
            <span>{t("qr.nav.menu")}</span>
          </span>
        )}

        {activeBranchId ? (
          <Link to={`/m/branch/${activeBranchId}/cart`} className={linkClass(active === "cart" || onCart)}>
            <span className="oses-bottom-nav__icon-wrap">
              <i className="fa fa-shopping-cart" />
              {storedCartCount > 0 && <em>{storedCartCount}</em>}
            </span>
            <span>{t("qr.myCart")}</span>
          </Link>
        ) : (
          <span className="oses-bottom-nav__link is-disabled">
            <i className="fa fa-shopping-cart" />
            <span>{t("qr.myCart")}</span>
          </span>
        )}
      </div>
    </nav>
  );
}
