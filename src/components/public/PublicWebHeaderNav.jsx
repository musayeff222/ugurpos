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

  return (
    <nav className="public-web-nav public-web-nav--bottom" aria-label="Site navigation">
      <div className="public-web-nav__inner">
        <Link to="/m" className={`public-web-nav__link ${onLanding || active === "home" ? "active" : ""}`}>
          <i className="fa fa-home" />
          <span>{t("qr.nav.home")}</span>
        </Link>

        {branchId ? (
          <Link
            to={`/m/branch/${branchId}`}
            className={`public-web-nav__link ${(active === "menu" || onMenu) && !onOrders && !onCart ? "active" : ""}`}
          >
            <i className="fa fa-cutlery" />
            <span>{t("qr.nav.menu")}</span>
          </Link>
        ) : (
          <span className="public-web-nav__link public-web-nav__link--disabled">
            <i className="fa fa-cutlery" />
            <span>{t("qr.nav.menu")}</span>
          </span>
        )}

        {branchId ? (
          <Link
            to={`/m/branch/${branchId}/cart`}
            className={`public-web-nav__link public-web-nav__link--cart ${active === "cart" || onCart ? "active" : ""}`}
          >
            <i className="fa fa-shopping-cart" />
            <span>{t("qr.myCart")}</span>
            {storedCartCount > 0 && <em className="public-web-nav__badge">{storedCartCount}</em>}
          </Link>
        ) : (
          <span className="public-web-nav__link public-web-nav__link--disabled">
            <i className="fa fa-shopping-cart" />
            <span>{t("qr.myCart")}</span>
          </span>
        )}

        <Link to="/m/orders" className={`public-web-nav__link ${onOrders || active === "orders" ? "active" : ""}`}>
          <i className="fa fa-list-alt" />
          <span>{t("qr.nav.orders")}</span>
        </Link>
      </div>
    </nav>
  );
}
