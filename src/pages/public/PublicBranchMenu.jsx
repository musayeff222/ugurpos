import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import OsesSingleProduct from "../../components/oses-site/OsesSingleProduct";
import { useLocale } from "../../context/LocaleContext";
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
        return prev.map((line) =>
          line.productId === product.id ? { ...line, qty: line.qty + 1 } : line
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price1, qty: 1, imageUrl }];
    });
  };

  if (loading) {
    return (
      <PublicQrShell firm={menu?.firm}>
        <div className="container py-5 text-center">{t("qr.loadingMenu")}</div>
      </PublicQrShell>
    );
  }

  if (!menu?.branch) {
    return (
      <PublicQrShell firm={menu?.firm}>
        <div className="container py-5 text-center text-danger">{error || t("qr.menuNotFound")}</div>
      </PublicQrShell>
    );
  }

  const branch = menu.branch;
  const canOrder = branch.menuAcceptOrders && branch.isOpen !== false;
  const groups = menu.groups || [];

  return (
    <PublicQrShell firm={menu.firm}>
      <div className="container productList">
        <div className="row">
          <div className="col-12 d-flex justify-content-between align-items-center flex-wrap my-3">
            <button type="button" className="btn_box_line" onClick={() => navigate("/m")}>
              ← {t("qr.nav.home")}
            </button>
            <p className="mb-0">
              <strong>#{branch.branchNo} {branch.name}</strong>
            </p>
            {cartCount > 0 && (
              <Link to={`/m/branch/${branchId}/cart`} className="btn_box_green btn_box">
                {t("qr.myCart")} ({cartCount}) · {money(cartTotal)}
              </Link>
            )}
          </div>
        </div>

        {!canOrder && (
          <div className="alert alert-warning">{branch.isOpen === false ? t("qr.closedNotice") : t("qr.viewOnlyNotice")}</div>
        )}

        <div className="row">
          <div className="col-12">
            <h2 className="title32 txt_green my-4">{t("qr.nav.products")}</h2>
            <input
              className="form-control mb-3"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("qr.searchProduct")}
            />
          </div>
        </div>

        {groups.length > 0 && (
          <nav className="d-none d-sm-block">
            <div className="nav nav-tabs nav-justified mb-3">
              <button
                type="button"
                className={`nav-item nav-link${activeGroup === "all" ? " active" : ""}`}
                onClick={() => setActiveGroup("all")}
              >
                {t("common.all")}
              </button>
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className={`nav-item nav-link${activeGroup === group.id ? " active" : ""}`}
                  onClick={() => setActiveGroup(group.id)}
                >
                  {group.name}
                </button>
              ))}
            </div>
          </nav>
        )}

        <div className="row">
          {products.map((product) => (
            <div key={product.id} className="col-12 col-lg-3 col-md-4 col-sm-6 my-4">
              <OsesSingleProduct
                product={product}
                imageSrc={getPublicProductImageSrc(branchId, product)}
                priceLabel={money(product.price1)}
                canOrder={canOrder}
                onAdd={() => addToCart(product)}
              />
            </div>
          ))}
          {products.length === 0 && (
            <div className="col-12 text-center py-5">{t("qr.noProducts")}</div>
          )}
        </div>
      </div>
    </PublicQrShell>
  );
}
