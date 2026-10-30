import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import OsesSingleProduct from "../../components/oses-site/OsesSingleProduct";
import { useLocale } from "../../context/LocaleContext";
import { getBranchLabel } from "../../utils/branchDisplay";
import { formatPublicMoney } from "../../utils/publicMoney";
import { fetchPublicBranchMenu, getPublicProductImageSrc } from "../../utils/qrMenuPublic";
import { loadBranchCart, saveBranchCart, saveLastBranchId } from "../../utils/qrMenuStorage";

export default function PublicBranchMenu() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const { t } = useLocale();
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
  const money = (v) => formatPublicMoney(v);

  const addToCart = (product) => {
    const imageUrl = getPublicProductImageSrc(branchId, product);
    setCart((prev) => {
      const existing = prev.find((line) => line.productId === product.id);
      if (existing) {
        return prev.map((line) => (line.productId === product.id ? { ...line, qty: line.qty + 1 } : line));
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price1, qty: 1, imageUrl }];
    });
  };

  if (loading) {
    return (
      <PublicQrShell firm={menu?.firm}>
        <div className="ps-loading">{t("qr.loadingMenu")}</div>
      </PublicQrShell>
    );
  }

  if (!menu?.branch) {
    return (
      <PublicQrShell firm={menu?.firm}>
        <div className="ps-empty">{error || t("qr.menuNotFound")}</div>
      </PublicQrShell>
    );
  }

  const branch = menu.branch;
  const canOrder = branch.menuAcceptOrders && branch.isOpen !== false;
  const groups = menu.groups || [];

  return (
    <PublicQrShell firm={menu.firm}>
      <div className="ps-wrap">
        <div className="ps-menu-top">
          <button type="button" className="ps-btn-ghost" onClick={() => navigate("/m")}>
            ← {t("qr.nav.home")}
          </button>
          <strong>{getBranchLabel(branch)}</strong>
          <Link to={`/m/branch/${branchId}/cart`} className="ps-btn">
            {t("qr.myCart")} ({cartCount}) · {money(cartTotal)}
          </Link>
        </div>

        {!canOrder && (
          <div className="ps-alert">{branch.isOpen === false ? t("qr.closedNotice") : t("qr.viewOnlyNotice")}</div>
        )}

        <h2>{t("qr.nav.products")}</h2>
        <input
          className="ps-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("qr.searchProduct")}
        />

        {groups.length > 0 && (
          <nav className="ps-tabs">
            <button type="button" className={activeGroup === "all" ? "is-active" : ""} onClick={() => setActiveGroup("all")}>
              {t("common.all")}
            </button>
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                className={activeGroup === group.id ? "is-active" : ""}
                onClick={() => setActiveGroup(group.id)}
              >
                {group.name}
              </button>
            ))}
          </nav>
        )}

        <div className="ps-products" style={{ paddingBottom: 48 }}>
          {products.map((product) => (
            <OsesSingleProduct
              key={product.id}
              product={product}
              imageSrc={getPublicProductImageSrc(branchId, product)}
              priceLabel={money(product.price1)}
              canOrder={canOrder}
              onAdd={() => addToCart(product)}
            />
          ))}
        </div>
        {products.length === 0 && <div className="ps-empty">{t("qr.noProducts")}</div>}
      </div>
    </PublicQrShell>
  );
}
