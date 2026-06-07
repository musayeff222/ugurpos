import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Modal from "../../components/ui/Modal";
import { formatMoney } from "../../utils/format";
import {
  fetchPublicBranchMenu,
  getPublicProductImageSrc,
  submitPublicOrder,
} from "../../utils/qrMenuPublic";
import "../../styles/public-qr-menu.css";

export default function PublicBranchMenu() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState("all");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ customerName: "", customerPhone: "", tableNo: "", note: "" });

  useEffect(() => {
    setLoading(true);
    setCart([]);
    fetchPublicBranchMenu(branchId)
      .then(setMenu)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [branchId]);

  const products = useMemo(() => {
    if (!menu) return [];
    if (activeGroup === "all") return menu.products;
    return menu.products.filter((p) => p.groupId === activeGroup);
  }, [menu, activeGroup]);

  const cartTotal = cart.reduce((sum, line) => sum + line.qty * line.price, 0);
  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0);

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
    setCartOpen(true);
  };

  const updateQty = (productId, qty) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((line) => line.productId !== productId);
      return prev.map((line) => (line.productId === productId ? { ...line, qty } : line));
    });
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!form.customerName.trim() || cart.length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const order = await submitPublicOrder(menu.branch.id, {
        branchId: menu.branch.id,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        tableNo: form.tableNo.trim(),
        note: form.note.trim(),
        items: cart.map((line) => ({ productId: line.productId, qty: line.qty })),
      });
      navigate(`/m/order/${order.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="public-menu-page">
        <div className="public-menu-loading">Menü yükleniyor…</div>
      </div>
    );
  }

  if (error && !menu) {
    return (
      <div className="public-menu-page">
        <div className="public-menu-error card">{error}</div>
        <Link to="/m" className="btn btn-default">
          Şube Seçimine Dön
        </Link>
      </div>
    );
  }

  const branch = menu.branch;

  return (
    <div className="public-menu-page">
      <header className="public-menu-header">
        <Link to="/m" className="public-menu-back">
          ← Şube değiştir
        </Link>
        <div className="public-menu-header__badge">QR Menü</div>
        <h1>{branch.menuTitle || branch.name}</h1>
        {branch.menuWelcome && <p>{branch.menuWelcome}</p>}
        <div className="public-menu-branch-tag">
          <i className="fa fa-map-marker" />
          Sipariş şubesi: <strong>#{branch.branchNo} {branch.name}</strong>
          {branch.address ? ` · ${branch.address}` : ""}
        </div>
        {!branch.menuAcceptOrders && (
          <div className="public-menu-notice">Bu şube şu an yalnızca menü görüntüleme modundadır.</div>
        )}
      </header>

      {error && <div className="public-menu-alert">{error}</div>}

      <div className="public-menu-groups">
        <button type="button" className={activeGroup === "all" ? "active" : ""} onClick={() => setActiveGroup("all")}>
          Tümü
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
              <strong>{formatMoney(product.price1)}</strong>
              {branch.menuAcceptOrders && (
                <button type="button" className="btn btn-success btn-sm" onClick={() => addToCart(product)}>
                  Sepete Ekle
                </button>
              )}
            </div>
          </article>
        ))}
        {products.length === 0 && <p className="public-menu-empty">Bu grupta ürün yok.</p>}
      </div>

      {branch.menuAcceptOrders && cartCount > 0 && (
        <div className="public-menu-cart-bar">
          <button type="button" className="public-menu-cart-toggle" onClick={() => setCartOpen(true)}>
            Sepet ({cartCount}) — {formatMoney(cartTotal)}
          </button>
          <button type="button" className="btn btn-success" onClick={() => setCheckoutOpen(true)}>
            Sipariş Ver
          </button>
        </div>
      )}

      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="Sepetim">
        {cart.length === 0 ? (
          <p>Sepet boş.</p>
        ) : (
          <ul className="public-menu-cart-list">
            {cart.map((line) => (
              <li key={line.productId}>
                <div>
                  <strong>{line.name}</strong>
                  <span>{formatMoney(line.price)}</span>
                </div>
                <div className="public-menu-cart-qty">
                  <button type="button" onClick={() => updateQty(line.productId, line.qty - 1)}>
                    −
                  </button>
                  <span>{line.qty}</span>
                  <button type="button" onClick={() => updateQty(line.productId, line.qty + 1)}>
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="public-menu-cart-total">
          <span>Toplam</span>
          <strong>{formatMoney(cartTotal)}</strong>
        </div>
        <button
          type="button"
          className="btn btn-success"
          disabled={!cart.length}
          onClick={() => {
            setCartOpen(false);
            setCheckoutOpen(true);
          }}
        >
          Siparişi Tamamla
        </button>
      </Modal>

      <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Sipariş Bilgileri">
        <form className="public-menu-checkout" onSubmit={handleSubmitOrder}>
          <p className="public-menu-checkout-branch">
            Siparişiniz <strong>#{branch.branchNo} {branch.name}</strong> şubesine iletilecek.
          </p>
          <label>Ad Soyad *</label>
          <input
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            required
          />
          <label>Telefon</label>
          <input
            value={form.customerPhone}
            onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
          />
          <label>Masa / Not</label>
          <input
            value={form.tableNo}
            onChange={(e) => setForm({ ...form, tableNo: e.target.value })}
            placeholder="Masa 5"
          />
          <label>Sipariş notu</label>
          <textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <button type="submit" className="btn btn-success" disabled={submitting || cart.length === 0}>
            {submitting ? "Gönderiliyor…" : `Siparişi Gönder (${formatMoney(cartTotal)})`}
          </button>
        </form>
      </Modal>
    </div>
  );
}
