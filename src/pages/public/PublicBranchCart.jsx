import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import PublicQrBottomNav from "../../components/public/PublicQrBottomNav";
import QrMenuHeader from "../../components/public/QrMenuHeader";
import { useLocale } from "../../context/LocaleContext";
import { formatMoney } from "../../utils/format";
import { fetchPublicBranchMenu, submitPublicOrder } from "../../utils/qrMenuPublic";
import { loadBranchCart, saveBranchCart, rememberOrder } from "../../utils/qrMenuStorage";
import "../../styles/public-qr-menu.css";

export default function PublicBranchCart() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useLocale();
  const [menu, setMenu] = useState(null);
  const [cart, setCart] = useState(() => loadBranchCart(branchId));
  const [form, setForm] = useState({ customerName: "", customerPhone: "", tableNo: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPublicBranchMenu(branchId).then(setMenu).catch((e) => setError(e.message));
  }, [branchId]);

  useEffect(() => {
    saveBranchCart(branchId, cart);
  }, [branchId, cart]);

  const cartTotal = cart.reduce((sum, line) => sum + line.qty * line.price, 0);
  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const money = (value) => formatMoney(value, lang);

  const updateQty = (productId, qty) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((line) => line.productId !== productId);
      return prev.map((line) => (line.productId === productId ? { ...line, qty } : line));
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerName.trim() || cart.length === 0 || !menu) return;
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
      rememberOrder(order);
      saveBranchCart(branchId, []);
      navigate(`/m/order/${order.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const branch = menu?.branch;
  const branchLabel = branch ? `#${branch.branchNo} ${branch.name}` : "";
  const canOrder = branch?.menuAcceptOrders && branch?.isOpen !== false;

  return (
    <PublicQrShell firm={menu?.firm}>
      <QrMenuHeader firm={menu?.firm} branch={branch} showBack onBack={() => navigate(`/m/branch/${branchId}`)} />

      <div className="public-cart-page card">
        <h2>{t("qr.myCart")}</h2>
        {cart.length === 0 ? (
          <p>{t("qr.cartEmpty")}</p>
        ) : (
          <ul className="public-menu-cart-list">
            {cart.map((line) => (
              <li key={line.productId}>
                <div>
                  <strong>{line.name}</strong>
                  <span>{money(line.price)}</span>
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
          <span>{t("common.total")}</span>
          <strong>{money(cartTotal)}</strong>
        </div>
      </div>

      {cart.length > 0 && canOrder && (
        <form className="card public-menu-checkout public-cart-checkout" onSubmit={handleSubmit}>
          <h3>{t("qr.checkoutTitle")}</h3>
          <p className="public-menu-checkout-branch">{t("qr.checkoutBranch", { branch: branchLabel })}</p>
          {error && <div className="public-menu-alert">{error}</div>}
          <label>{t("qr.fullName")} *</label>
          <input
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            required
          />
          <label>{t("qr.phone")}</label>
          <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
          <label>{t("qr.tableNote")}</label>
          <input
            value={form.tableNo}
            onChange={(e) => setForm({ ...form, tableNo: e.target.value })}
            placeholder={t("qr.tablePlaceholder")}
          />
          <label>{t("qr.orderNote")}</label>
          <textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <button type="submit" className="btn btn-success btn-block" disabled={submitting}>
            {submitting ? t("qr.sending") : t("qr.sendOrder", { total: money(cartTotal) })}
          </button>
        </form>
      )}

      {cart.length > 0 && !canOrder && (
        <div className="public-menu-notice">{branch?.isOpen === false ? t("qr.closedNotice") : t("qr.viewOnlyNotice")}</div>
      )}

      <Link to={`/m/branch/${branchId}`} className="btn btn-default public-cart-back-link">
        ← {t("qr.nav.menu")}
      </Link>

      <PublicQrBottomNav branchId={branchId} cartCount={cartCount} active="cart" />
    </PublicQrShell>
  );
}
