import { Link, useLocation } from "react-router-dom";
import { useLocale } from "../../context/LocaleContext";

export default function PublicQrBottomNav({ branchId, cartCount = 0, active = "menu" }) {
  const { t } = useLocale();
  const location = useLocation();
  const onOrders = location.pathname === "/m/orders";
  const onLanding = location.pathname === "/m";

  return (
    <nav className="public-web-nav" aria-label="Online order navigation">
      <div className="public-web-nav__inner">
        <Link to="/m" className={`public-web-nav__link ${onLanding ? "active" : ""}`}>
          <i className="fa fa-home" />
          <span>{t("qr.nav.home")}</span>
        </Link>
        {branchId && (
          <>
            <Link
              to={`/m/branch/${branchId}`}
              className={`public-web-nav__link ${active === "menu" && !onOrders ? "active" : ""}`}
            >
              <i className="fa fa-th" />
              <span>{t("qr.nav.menu")}</span>
            </Link>
            <Link
              to={`/m/branch/${branchId}/cart`}
              className={`public-web-nav__link public-web-nav__link--cart ${active === "cart" ? "active" : ""}`}
            >
              <i className="fa fa-shopping-cart" />
              <span>{t("qr.nav.cart")}</span>
              {cartCount > 0 && <em className="public-web-nav__badge">{cartCount}</em>}
            </Link>
          </>
        )}
        <Link to="/m/orders" className={`public-web-nav__link ${onOrders ? "active" : ""}`}>
          <i className="fa fa-list-alt" />
          <span>{t("qr.nav.orders")}</span>
        </Link>
      </div>
    </nav>
  );
}
