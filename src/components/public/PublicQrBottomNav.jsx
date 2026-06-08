import { Link, useLocation } from "react-router-dom";
import { useLocale } from "../../context/LocaleContext";

export default function PublicQrBottomNav({ branchId, cartCount = 0, active = "menu" }) {
  const { t } = useLocale();
  const location = useLocation();
  const onOrders = location.pathname === "/m/orders";
  const onLanding = location.pathname === "/m";

  return (
    <nav className="public-qr-bottom-nav" aria-label="QR menu navigation">
      <Link to="/m" className={onLanding ? "active" : ""}>
        <i className="fa fa-home" />
        <span>{t("qr.nav.home")}</span>
      </Link>
      {branchId && (
        <>
          <Link
            to={`/m/branch/${branchId}`}
            className={active === "menu" && !onOrders ? "active" : ""}
          >
            <i className="fa fa-book" />
            <span>{t("qr.nav.menu")}</span>
          </Link>
          <Link
            to={`/m/branch/${branchId}/cart`}
            className={active === "cart" ? "active" : ""}
          >
            <i className="fa fa-shopping-basket" />
            <span>{t("qr.nav.cart")}</span>
            {cartCount > 0 && <em className="public-qr-bottom-nav__badge">{cartCount}</em>}
          </Link>
        </>
      )}
      <Link to="/m/orders" className={onOrders ? "active" : ""}>
        <i className="fa fa-list-alt" />
        <span>{t("qr.nav.orders")}</span>
      </Link>
    </nav>
  );
}
