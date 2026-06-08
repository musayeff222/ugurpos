import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import PublicQrBottomNav from "../../components/public/PublicQrBottomNav";
import QrMenuHeader from "../../components/public/QrMenuHeader";
import { useLocale } from "../../context/LocaleContext";
import { formatMoney } from "../../utils/format";
import {
  fetchPublicBranchMenu,
  getPublicProductImageSrc,
} from "../../utils/qrMenuPublic";
import { loadBranchCart, saveBranchCart } from "../../utils/qrMenuStorage";
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
    fetchPublicBranchMenu(branchId)
      .then(setMenu)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [branchId]);

  useEffect(() => {
    saveBranchCart(branchId, cart);
  }, [branchId, cart]);

  const products = useMemo(() => {
    if (!menu) return [];
    if (activeGroup === "all") return menu.products;
    return menu.products.filter((p) => p.groupId === activeGroup);
  }, [menu, activeGroup]);

  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0);
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
      <PublicQrShell firm={menu?.firm}>
        <div className="public-menu-loading">{t("qr.loadingMenu")}</div>
      </PublicQrShell>
    );
  }

  if (error && !menu) {
    return (
      <PublicQrShell firm={menu?.firm}>
        <div className="public-menu-error card">{error}</div>
        <Link to="/m" className="btn btn-default">
          {t("qr.backToBranches")}
        </Link>
      </PublicQrShell>
    );
  }

  const branch = menu.branch;
  const canOrder = branch.menuAcceptOrders && branch.isOpen !== false;

  return (
    <PublicQrShell firm={menu.firm}>
      <QrMenuHeader firm={menu.firm} branch={branch} showBack onBack={() => navigate("/m")} />

      {error && <div className="public-menu-alert">{error}</div>}

      <div className="public-menu-groups">
        <button type="button" className={activeGroup === "all" ? "active" : ""} onClick={() => setActiveGroup("all")}>
          {t("common.all")}
        </button>
        {menu.groups.map((group) => (
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

      <div className="public-menu-grid public-menu-grid--with-nav">
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
              <strong>{money(product.price1)}</strong>
              {canOrder && (
                <button type="button" className="btn btn-success btn-sm" onClick={() => addToCart(product)}>
                  {t("qr.addToCart")}
                </button>
              )}
            </div>
          </article>
        ))}
        {products.length === 0 && <p className="public-menu-empty">{t("qr.noProducts")}</p>}
      </div>

      <PublicQrBottomNav branchId={branchId} cartCount={cartCount} active="menu" />
    </PublicQrShell>
  );
}
