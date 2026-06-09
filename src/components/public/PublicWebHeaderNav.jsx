import { Link, useLocation } from "react-router-dom";
import { useLocale } from "../../context/LocaleContext";
import { loadBranchCart } from "../../utils/qrMenuStorage";

export default function PublicWebHeaderNav({ branchId, cartCount = 0, active = "home" }) {
  const { t } = useLocale();
  const location = useLocation();
  const onOrders = location.pathname === "/m/orders" || location.pathname.startsWith("/m/order/");
  const onLanding = location.pathname === "/m";
  const onCart = location.pathname.includes("/cart");
  const onMenu = branchId && location.pathname === `/m/branch/${branchId}`;
  const storedCartCount =
    cartCount || (branchId ? loadBranchCart(branchId).reduce((sum, line) => sum + line.qty, 0) : 0);

  const linkClass = (isActive) => `stitch-bottom-nav__link${isActive ? " is-active" : ""}`;

  return (
    <nav className="stitch-bottom-nav" aria-label="Site navigation">
      <div className="stitch-bottom-nav__inner">
        <Link to="/m" className={linkClass(onLanding || active === "home")}>
          <i className="fa fa-home" />
          <span>{t("qr.nav.home")}</span>
        </Link>

        {branchId ? (
          <Link to={`/m/branch/${branchId}`} className={linkClass((active === "menu" || onMenu) && !onOrders && !onCart)}>
            <i className="fa fa-book" />
            <span>{t("qr.nav.menu")}</span>
          </Link>
        ) : (
          <span className="stitch-bottom-nav__link is-disabled">
            <i className="fa fa-book" />
            <span>{t("qr.nav.menu")}</span>
          </span>
        )}

        {branchId ? (
          <Link to={`/m/branch/${branchId}/cart`} className={`${linkClass(active === "cart" || onCart)} stitch-bottom-nav__link--cart`}>
            <span className="stitch-bottom-nav__icon-wrap">
              <i className="fa fa-shopping-cart" />
              {storedCartCount > 0 && <em>{storedCartCount}</em>}
            </span>
            <span>{t("qr.myCart")}</span>
          </Link>
        ) : (
          <span className="stitch-bottom-nav__link is-disabled">
            <i className="fa fa-shopping-cart" />
            <span>{t("qr.myCart")}</span>
          </span>
        )}

        <Link to="/m/orders" className={linkClass(onOrders || active === "orders")}>
          <i className="fa fa-list-alt" />
          <span>{t("qr.nav.orders")}</span>
        </Link>
      </div>
    </nav>
  );
}
