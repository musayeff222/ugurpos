import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import LanguageSwitcher from "../public/LanguageSwitcher";
import { useLocale } from "../../context/LocaleContext";
import { getLastBranchId, loadBranchCart } from "../../utils/qrMenuStorage";

export default function OsesSiteHeader({ firm }) {
  const { t } = useLocale();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const branchId = getLastBranchId();
  const logoUrl = firm?.logoUrl || "/oses/assets/images/oses.png";
  const title = firm?.menuTitle || "Cigkofte";
  const cartCount = branchId
    ? loadBranchCart(branchId).reduce((sum, line) => sum + line.qty, 0)
    : 0;
  const cartPath = branchId ? `/m/branch/${branchId}/cart` : "/m";
  const menuPath = branchId ? `/m/branch/${branchId}` : "/m";

  const nav = [
    { label: t("qr.osesNavCorporate"), to: "/m" },
    { label: t("qr.nav.products"), to: menuPath },
    { label: t("qr.nav.campaigns"), to: "/m#kampanyalar" },
    { label: t("qr.nav.branches"), to: "/m#subeler" },
    { label: t("qr.osesNavMedia"), to: "/m#iletisim" },
    { label: t("qr.osesNavFranchise"), to: "/m#franchise" },
    { label: t("qr.nav.contact"), to: "/m#iletisim" },
  ];

  const isActive = (to) => {
    if (to === "/m" && location.pathname === "/m") return true;
    if (to.startsWith("/m/branch") && location.pathname.startsWith("/m/branch") && !location.pathname.includes("/cart")) return true;
    if (to.includes("/cart") && location.pathname.includes("/cart")) return true;
    return false;
  };

  return (
    <>
      <div className="account">
        <div className="container">
          <div className="row">
            <div className="col-6">
              <LanguageSwitcher compact />
            </div>
            <div className="col-6 text-right">
              {branchId && (
                <Link to={cartPath} style={{ marginRight: 12 }}>
                  <i className="fas fa-shopping-cart" /> {t("qr.myCart")}
                  {cartCount > 0 && ` (${cartCount})`}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <header className="sticky-top">
        <div className="container">
          <nav className="navbar navbar-expand-lg">
            <Link className="navbar-brand" to="/m">
              {firm?.logoUrl ? (
                <img src={logoUrl} alt={title} key={logoUrl} />
              ) : (
                <img src="/oses/assets/images/oses.png" alt={title} />
              )}
            </Link>
            <button
              className="navbar-toggler"
              type="button"
              aria-label="Menü"
              onClick={() => setNavOpen((v) => !v)}
            >
              <i className="fas fa-bars" />
            </button>
            <div className={`collapse navbar-collapse${navOpen ? " show" : ""}`} id="navbarNavDropdown">
              <ul className="navbar-nav ml-auto">
                {nav.map((item) => (
                  <li className="nav-item" key={item.label}>
                    {item.to.startsWith("/m#") ? (
                      <a className="nav-link" href={item.to} onClick={() => setNavOpen(false)}>
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        className={`nav-link${isActive(item.to) ? " active" : ""}`}
                        to={item.to}
                        onClick={() => setNavOpen(false)}
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}
