import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import ImpersonationBanner from "../../components/ImpersonationBanner";
import SyncStatus from "../../components/SyncStatus";
import { useAuth } from "../../context/AuthContext";
import { useOffline } from "../../offline/OfflineContext";
import { useStore } from "../../store/StoreContext";
import { formatMoney, uid } from "../../utils/format";
import { isKasiyerAccount, loginPathForAccount } from "../../utils/authRedirect";
import "../../styles/cashier.css";

export default function CashierApp() {
  const { user, isAuthenticated, logout, isImpersonating } = useAuth();
  const { isOnline, pendingCount } = useOffline();
  const { state, loading, completeSale } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [groupId, setGroupId] = useState("");
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState("");
  const [paying, setPaying] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  const products = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (state.products || []).filter((product) => {
      if (product.active === false || product.onSalePage === false) return false;
      if (groupId && product.groupId !== groupId) return false;
      if (!term) return true;
      return (
        String(product.name || "").toLowerCase().includes(term) ||
        String(product.barcode || "").includes(term)
      );
    });
  }, [state.products, query, groupId]);

  const groups = useMemo(() => {
    const ids = new Set(
      (state.products || []).filter((p) => p.active !== false && p.onSalePage !== false).map((p) => p.groupId)
    );
    return (state.groups || []).filter((group) => ids.has(group.id));
  }, [state.products, state.groups]);

  if (!isAuthenticated) {
    return <Navigate to="/login/kasiyer" replace />;
  }

  if (!isKasiyerAccount(user)) {
    return <Navigate to="/sales" replace />;
  }

  const total = cart.reduce((sum, line) => sum + line.qty * line.price, 0);
  const qtyCount = cart.reduce((sum, line) => sum + line.qty, 0);

  const addProduct = (product) => {
    setCart((prev) => {
      const found = prev.find((line) => line.productId === product.id);
      if (found) {
        return prev.map((line) => (line.productId === product.id ? { ...line, qty: line.qty + 1 } : line));
      }
      return [
        ...prev,
        {
          id: uid("line"),
          productId: product.id,
          name: product.name,
          qty: 1,
          price: Number(product.price1) || 0,
          discount: 0,
        },
      ];
    });
    setMessage("");
    setCartOpen(true);
  };

  const changeQty = (lineId, delta) => {
    setCart((prev) =>
      prev
        .map((line) => (line.id === lineId ? { ...line, qty: line.qty + delta } : line))
        .filter((line) => line.qty > 0)
    );
  };

  const pay = async (paymentType) => {
    if (!cart.length || paying) return;
    setPaying(paymentType);
    setMessage("");
    try {
      const sale = await completeSale({
        items: cart,
        paymentType,
        staffName: user?.staffName || "Kassir",
        discount: 0,
        discountType: "TL",
        paidAmount: total,
      });
      setCart([]);
      setCartOpen(false);
      setMessage(
        sale?.pendingSync || !isOnline
          ? `${sale?.code || "Satış"} saxlandı. İnternet gələndə serverə gedəcək.`
          : `${sale?.code || "Satış"} tamamlandı.`
      );
    } catch (err) {
      setMessage(err.message || "Satış yazılmadı.");
    } finally {
      setPaying("");
    }
  };

  const handleLogout = () => {
    const next = loginPathForAccount(user);
    logout();
    navigate(next, { replace: true });
  };

  return (
    <div className="kasa-app">
      {isImpersonating && <ImpersonationBanner />}
      <header className="kasa-top">
        <div>
          <strong>Kassir</strong>
          <span>
            {user?.staffName || "Kassir"}
            {user?.branchName ? ` · ${user.branchName}` : ""}
          </span>
        </div>
        <SyncStatus />
        <button type="button" className="kasa-logout" onClick={handleLogout}>
          Çıxış
        </button>
      </header>

      {!isOnline && (
        <p className="kasa-banner">
          İnternet yoxdur. Satış davam edir
          {pendingCount > 0 ? ` · ${pendingCount} satış serverə gedəcək` : ""}.
        </p>
      )}
      {isOnline && pendingCount > 0 && (
        <p className="kasa-banner kasa-banner--sync">{pendingCount} satış serverə yüklənir.</p>
      )}
      {message && <p className="kasa-message">{message}</p>}

      <div className={`kasa-body ${cartOpen ? "kasa-body--cart" : ""}`}>
        <section className="kasa-products">
          <input
            className="kasa-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Məhsul və ya barkod..."
            inputMode="search"
          />
          {groups.length > 0 && (
            <div className="kasa-groups">
              <button type="button" className={!groupId ? "is-on" : ""} onClick={() => setGroupId("")}>
                Hamısı
              </button>
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className={groupId === group.id ? "is-on" : ""}
                  onClick={() => setGroupId(group.id)}
                >
                  {group.name}
                </button>
              ))}
            </div>
          )}
          {loading && !products.length ? (
            <p className="kasa-empty">Məhsullar yüklənir...</p>
          ) : products.length === 0 ? (
            <p className="kasa-empty">
              {state.products?.length
                ? "Bu axtarışda məhsul yoxdur."
                : "Məhsul siyahısı yoxdur. Bir dəfə internetlə girin ki, siyahı yadda qalsın."}
            </p>
          ) : (
            <div className="kasa-grid">
              {products.map((product) => (
                <button key={product.id} type="button" className="kasa-product" onClick={() => addProduct(product)}>
                  <span>{product.name}</span>
                  <strong>{formatMoney(product.price1 || 0, "az")}</strong>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="kasa-cart">
          <h2>Səbət</h2>
          {cart.length === 0 ? (
            <p className="kasa-empty">Məhsul seçin.</p>
          ) : (
            <ul>
              {cart.map((line) => (
                <li key={line.id}>
                  <div>
                    <strong>{line.name}</strong>
                    <span>{formatMoney(line.qty * line.price, "az")}</span>
                  </div>
                  <div className="kasa-qty">
                    <button type="button" onClick={() => changeQty(line.id, -1)} aria-label="Azalt">
                      −
                    </button>
                    <em>{line.qty}</em>
                    <button type="button" onClick={() => changeQty(line.id, 1)} aria-label="Artır">
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="kasa-total">
            <span>Cəm</span>
            <strong>{formatMoney(total, "az")}</strong>
          </div>
          <div className="kasa-pay">
            <button type="button" disabled={!cart.length || !!paying} onClick={() => pay("cash")}>
              {paying === "cash" ? "..." : "Nəğd"}
            </button>
            <button type="button" className="kasa-pay--card" disabled={!cart.length || !!paying} onClick={() => pay("pos")}>
              {paying === "pos" ? "..." : "Kart"}
            </button>
          </div>
        </aside>
      </div>

      <button type="button" className="kasa-cart-fab" onClick={() => setCartOpen((open) => !open)}>
        {cartOpen ? "Məhsullar" : `Səbət${qtyCount ? ` (${qtyCount})` : ""}`}
        <strong>{formatMoney(total, "az")}</strong>
      </button>
    </div>
  );
}
