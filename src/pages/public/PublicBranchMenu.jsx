import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import PublicBranchBar from "../../components/public/PublicBranchBar";
import StitchProductCard from "../../components/public/StitchProductCard";
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
  const [search, setSearch] = useState("");
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
    let list = menu.products;
    if (activeGroup !== "all") list = list.filter((p) => p.groupId === activeGroup);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name?.toLowerCase().includes(q));
    return list;
  }, [menu, activeGroup, search]);

  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const cartTotal = cart.reduce((sum, line) => sum + line.qty * line.price, 0);
  const money = (value) => formatMoney(value, lang);

  const addToCart = (product) => {
    const imageUrl = product.hasImage ? getPublicProductImageSrc(branchId, product) : null;
    setCart((prev) => {
      const existing = prev.find((line) => line.productId === product.id);
      if (existing) {
        return prev.map((line) =>
          line.productId === product.id ? { ...line, qty: line.qty + 1 } : line
        );
      }
      return [
        ...prev,
        { productId: product.id, name: product.name, price: product.price1, qty: 1, imageUrl },
      ];
    });
  };

  if (loading) {
    return (
      <PublicQrShell firm={menu?.firm} branchId={branchId} navActive="menu">
        <div className="sf-container">
          <div className="sf-loading">{t("qr.loadingMenu")}</div>
        </div>
      </PublicQrShell>
    );
  }

  if (error && !menu) {
    return (
      <PublicQrShell firm={menu?.firm} branchId={branchId} navActive="menu">
        <div className="sf-container">
          <div className="sf-alert">{error}</div>
        </div>
      </PublicQrShell>
    );
  }

  if (!menu?.branch) {
    return (
      <PublicQrShell firm={menu?.firm} branchId={branchId} navActive="menu">
        <div className="sf-container">
          <div className="sf-alert">{error || t("qr.menuNotFound")}</div>
        </div>
      </PublicQrShell>
    );
  }

  const branch = menu.branch;
  const canOrder = branch.menuAcceptOrders && branch.isOpen !== false;

  return (
    <PublicQrShell firm={menu.firm} branchId={branchId} cartCount={cartCount} navActive="menu">
      <div className="sf-menu-page">
        <div className="sf-container">
          <PublicBranchBar branch={branch} onBack={() => navigate("/m")} />

          {error && <div className="sf-alert">{error}</div>}
          {!canOrder && branch.menuAcceptOrders === false && (
            <div className="sf-alert">{t("qr.viewOnlyNotice")}</div>
          )}
          {branch.menuAcceptOrders && !branch.isOpen && (
            <div className="sf-alert">{t("qr.closedNotice")}</div>
          )}

          <div className="sf-search sf-search--menu">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("qr.searchProduct")}
            />
            <span className="material-symbols-outlined">search</span>
          </div>
        </div>

        <div className="sf-category-sticky">
          <div className="sf-category-bar">
            <button type="button" className={activeGroup === "all" ? "is-active" : ""} onClick={() => setActiveGroup("all")}>
              {t("common.all")}
            </button>
            {(menu.groups || []).map((group) => (
              <button
                key={group.id}
                type="button"
                className={activeGroup === group.id ? "is-active" : ""}
                onClick={() => setActiveGroup(group.id)}
              >
                {group.name}
              </button>
            ))}
          </div>
        </div>

        <div className="sf-container">
          <div className="sf-section-head">
            <h2>{t("qr.popularFlavors")}</h2>
            {cartCount > 0 && (
              <Link to={`/m/branch/${branchId}/cart`} className="sf-link">
                {t("qr.myCart")} · {money(cartTotal)}
              </Link>
            )}
          </div>

          <div className="sf-product-grid">
            {products.map((product, index) => (
              <StitchProductCard
                key={product.id}
                product={product}
                imageSrc={product.hasImage ? getPublicProductImageSrc(branchId, product) : null}
                priceLabel={money(product.price1)}
                description={product.unit ? `${product.unit}` : undefined}
                canOrder={canOrder}
                onAdd={() => addToCart(product)}
                badge={index === 0 ? { text: t("qr.popularBadge"), tone: "green" } : index === 1 ? { text: t("qr.popularBadgeAlt"), tone: "brown" } : null}
              />
            ))}
            {products.length === 0 && <p className="sf-empty">{t("qr.noProducts")}</p>}
          </div>
        </div>
      </div>
    </PublicQrShell>
  );
}
