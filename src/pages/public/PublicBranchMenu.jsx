import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import OsesBranchBar from "../../components/public/OsesBranchBar";
import OsesProductCard from "../../components/public/OsesProductCard";
import { useLocale } from "../../context/LocaleContext";
import { formatPublicMoney } from "../../utils/publicMoney";
import { fetchPublicBranchMenu, getPublicProductImageSrc } from "../../utils/qrMenuPublic";
import { MENU_BANNER_IMAGE } from "../../utils/cigkofteSiteImages";
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
  const money = (value) => formatPublicMoney(value);

  const addToCart = (product) => {
    const imageUrl = getPublicProductImageSrc(branchId, product);
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
        <div className="oses-container">
          <div className="oses-loading">{t("qr.loadingMenu")}</div>
        </div>
      </PublicQrShell>
    );
  }

  if (error && !menu) {
    return (
      <PublicQrShell firm={menu?.firm} branchId={branchId} navActive="menu">
        <div className="oses-container">
          <div className="oses-alert">{error}</div>
        </div>
      </PublicQrShell>
    );
  }

  if (!menu?.branch) {
    return (
      <PublicQrShell firm={menu?.firm} branchId={branchId} navActive="menu">
        <div className="oses-container">
          <div className="oses-alert">{error || t("qr.menuNotFound")}</div>
        </div>
      </PublicQrShell>
    );
  }

  const branch = menu.branch;
  const canOrder = branch.menuAcceptOrders && branch.isOpen !== false;

  return (
    <PublicQrShell firm={menu.firm} branchId={branchId} cartCount={cartCount} navActive="menu">
      <div className="oses-menu-banner">
        <img src={MENU_BANNER_IMAGE} alt={menu.firm?.menuTitle || "Cigkofte"} loading="lazy" />
        <div className="oses-menu-banner__overlay">
          <div>
            <h1>{t("qr.nav.products")}</h1>
            <p>{branch.name}</p>
          </div>
        </div>
      </div>

      <section className="oses-section">
        <div className="oses-container">
          <OsesBranchBar branch={branch} onBack={() => navigate("/m")} />

          {error && <div className="oses-banner oses-banner--muted">{error}</div>}
          {!canOrder && branch.menuAcceptOrders === false && (
            <div className="oses-banner oses-banner--muted">{t("qr.viewOnlyNotice")}</div>
          )}
          {branch.menuAcceptOrders && !branch.isOpen && (
            <div className="oses-banner">{t("qr.closedNotice")}</div>
          )}

          <div className="oses-search">
            <i className="fa fa-search" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("qr.searchProduct")}
            />
          </div>

          <div className="oses-tabs">
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

          <div className="oses-section__head oses-section__head--left">
            <h2>{t("qr.popularFlavors")}</h2>
            {cartCount > 0 && (
              <Link to={`/m/branch/${branchId}/cart`} className="oses-text-link">
                {t("qr.myCart")} · {money(cartTotal)}
              </Link>
            )}
          </div>

          <div className="oses-products__grid">
            {products.map((product) => (
              <OsesProductCard
                key={product.id}
                product={product}
                imageSrc={getPublicProductImageSrc(branchId, product)}
                priceLabel={money(product.price1)}
                canOrder={canOrder}
                onAdd={() => addToCart(product)}
              />
            ))}
            {products.length === 0 && <p className="oses-empty">{t("qr.noProducts")}</p>}
          </div>
        </div>
      </section>
    </PublicQrShell>
  );
}
