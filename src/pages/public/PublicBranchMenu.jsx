import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import PublicBranchBar from "../../components/public/PublicBranchBar";
import { useLocale } from "../../context/LocaleContext";
import { formatMoney } from "../../utils/format";
import {
  fetchPublicBranchMenu,
  getPublicProductImageSrc,
} from "../../utils/qrMenuPublic";
import { loadBranchCart, saveBranchCart, saveLastBranchId } from "../../utils/qrMenuStorage";
import "../../styles/public-qr-menu.css";

export default function PublicBranchMenu() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useLocale();
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState("all");
  const [cart, setCart] = useState(() => loadBranchCart(branchId));

  useEffect(() => {
    setLoading(true);
    setCart(loadBranchCart(branchId));
    saveLastBranchId(branchId);
    fetchPublicBranchMenu(branchId)
      .then(setMenu)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [branchId]);

  useEffect(() => {
    saveBranchCart(branchId, cart);
  }, [branchId, cart]);

  const products = useMemo(() => {
    if (!menu?.products) return [];
    if (activeGroup === "all") return menu.products;
    return menu.products.filter((p) => p.groupId === activeGroup);
  }, [menu, activeGroup]);

  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const cartTotal = cart.reduce((sum, line) => sum + line.qty * line.price, 0);
  const money = (value) => formatMoney(value, lang);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((line) => line.productId === product.id);
      if (existing) {
        return prev.map((line) =>
          line.productId === product.id ? { ...line, qty: line.qty + 1 } : line
        );
      }
      return [
        ...prev,
        { productId: product.id, name: product.name, price: product.price1, qty: 1 },
      ];
    });
  };

  if (loading) {
    return (
      <PublicQrShell firm={menu?.firm} branchId={branchId} navActive="menu">
        <div className="public-web-container">
          <div className="public-menu-loading">{t("qr.loadingMenu")}</div>
        </div>
      </PublicQrShell>
    );
  }

  if (error && !menu) {
    return (
      <PublicQrShell firm={menu?.firm} branchId={branchId} navActive="menu">
        <div className="public-web-container">
          <div className="public-menu-error card">{error}</div>
          <Link to="/m" className="btn btn-default">
            {t("qr.backToBranches")}
          </Link>
        </div>
      </PublicQrShell>
    );
  }

  if (!menu?.branch) {
    return (
      <PublicQrShell firm={menu?.firm} branchId={branchId} navActive="menu">
        <div className="public-web-container">
          <div className="public-menu-error card">{error || t("qr.menuNotFound")}</div>
        </div>
      </PublicQrShell>
    );
  }

  const branch = menu.branch;
  const canOrder = branch.menuAcceptOrders && branch.isOpen !== false;

  return (
    <PublicQrShell firm={menu.firm} branchId={branchId} cartCount={cartCount} navActive="menu">
      <div className="public-web-container">
        <PublicBranchBar branch={branch} onBack={() => navigate("/m")} />

        {error && <div className="public-menu-alert">{error}</div>}
        {!canOrder && branch.menuAcceptOrders === false && (
          <div className="public-menu-alert">{t("qr.viewOnlyNotice")}</div>
        )}
        {branch.menuAcceptOrders && !branch.isOpen && (
          <div className="public-menu-alert">{t("qr.closedNotice")}</div>
        )}

        <div className="public-menu-layout">
          <aside className="public-menu-sidebar">
            <h2 className="public-menu-sidebar__title">{t("qr.nav.menu")}</h2>
            <div className="public-menu-groups public-menu-groups--sidebar">
              <button type="button" className={activeGroup === "all" ? "active" : ""} onClick={() => setActiveGroup("all")}>
                {t("common.all")}
              </button>
              {(menu.groups || []).map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className={activeGroup === group.id ? "active" : ""}
                  onClick={() => setActiveGroup(group.id)}
                >
                  {group.name}
                </button>
              ))}
            </div>

            {cartCount > 0 && (
              <div className="public-menu-sidebar__cart card">
                <h3>{t("qr.myCart")}</h3>
                <p>
                  {cartCount} · <strong>{money(cartTotal)}</strong>
                </p>
                <Link to={`/m/branch/${branchId}/cart`} className="btn btn-success btn-block">
                  {t("qr.completeOrder")}
                </Link>
              </div>
            )}
          </aside>

          <div className="public-menu-layout__main">
            <div className="public-menu-groups public-menu-groups--mobile">
              <button type="button" className={activeGroup === "all" ? "active" : ""} onClick={() => setActiveGroup("all")}>
                {t("common.all")}
              </button>
              {(menu.groups || []).map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className={activeGroup === group.id ? "active" : ""}
                  onClick={() => setActiveGroup(group.id)}
                >
                  {group.name}
                </button>
              ))}
            </div>

            <div className="public-menu-grid">
              {products.map((product) => (
                <article key={product.id} className="public-menu-product">
                  {product.hasImage ? (
                    <img
                      src={getPublicProductImageSrc(branchId, product)}
                      alt={product.name}
                      loading="lazy"
                    />
                  ) : (
                    <div className="public-menu-product__placeholder">
                      <i className="fa fa-cutlery" />
                    </div>
                  )}
                  <div className="public-menu-product__body">
                    <h3>{product.name}</h3>
                    <div className="public-menu-product__foot">
                      <strong>{money(product.price1)}</strong>
                      {canOrder && (
                        <button
                          type="button"
                          className="public-btn-add"
                          onClick={() => addToCart(product)}
                          aria-label={t("qr.addToCart")}
                        >
                          <i className="fa fa-plus" />
                          <span>{t("qr.addToCart")}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
              {products.length === 0 && <p className="public-menu-empty">{t("qr.noProducts")}</p>}
            </div>
          </div>
        </div>
      </div>
    </PublicQrShell>
  );
}
