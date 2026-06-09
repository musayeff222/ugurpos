import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import PublicBranchBar from "../../components/public/PublicBranchBar";
import { useLocale } from "../../context/LocaleContext";
import { formatMoney } from "../../utils/format";
import { requestUserLocation } from "../../utils/geo";
import { fetchPublicBranchMenu, submitPublicOrder } from "../../utils/qrMenuPublic";
import { loadBranchCart, saveBranchCart, rememberOrder, saveLastBranchId } from "../../utils/qrMenuStorage";
import "../../styles/public-qr-menu.css";

export default function PublicBranchCart() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useLocale();
  const [menu, setMenu] = useState(null);
  const [cart, setCart] = useState(() => loadBranchCart(branchId));
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    address: "",
    note: "",
    lat: "",
    lng: "",
  });
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    saveLastBranchId(branchId);
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

  const useMyLocation = async () => {
    setLocating(true);
    setError("");
    try {
      const { lat, lng } = await requestUserLocation();
      setForm((prev) => ({ ...prev, lat: String(lat), lng: String(lng) }));
    } catch {
      setError(t("qr.locationDenied"));
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.customerPhone.trim() || !form.address.trim() || cart.length === 0 || !menu) return;
    setSubmitting(true);
    setError("");
    try {
      const order = await submitPublicOrder(menu.branch.id, {
        branchId: menu.branch.id,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        deliveryAddress: form.address.trim(),
        deliveryLat: form.lat,
        deliveryLng: form.lng,
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
  const hasDeliveryLocation = form.lat && form.lng;

  return (
    <PublicQrShell firm={menu?.firm} branchId={branchId} cartCount={cartCount} navActive="cart">
      <div className="stitch-container">
        <PublicBranchBar branch={branch} onBack={() => navigate(`/m/branch/${branchId}`)} />

        <div className="stitch-page-head">
          <h2>{t("qr.completeOrder")}</h2>
          <p>{t("qr.checkoutBranch", { branch: branchLabel })}</p>
        </div>

        <div className="stitch-checkout-layout">
          <section className="stitch-panel">
            <h3>
              <i className="fa fa-shopping-cart" /> {t("qr.myCart")} ({cartCount})
            </h3>
            {cart.length === 0 ? (
              <p className="stitch-empty">{t("qr.cartEmpty")}</p>
            ) : (
              <ul className="stitch-cart-list">
                {cart.map((line) => (
                  <li key={line.productId} className="stitch-cart-item">
                    <div className="stitch-cart-item__media">
                      {line.imageUrl ? (
                        <img src={line.imageUrl} alt={line.name} />
                      ) : (
                        <div className="stitch-cart-item__placeholder">
                          <i className="fa fa-cutlery" />
                        </div>
                      )}
                    </div>
                    <div className="stitch-cart-item__body">
                      <div className="stitch-cart-item__head">
                        <strong>{line.name}</strong>
                        <span>{money(line.price * line.qty)}</span>
                      </div>
                      <div className="stitch-qty-pill">
                        <button type="button" onClick={() => updateQty(line.productId, line.qty - 1)} aria-label="-">
                          <i className="fa fa-minus" />
                        </button>
                        <span>{line.qty}</span>
                        <button type="button" onClick={() => updateQty(line.productId, line.qty + 1)} aria-label="+">
                          <i className="fa fa-plus" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="stitch-cart-total">
              <span>{t("common.total")}</span>
              <strong>{money(cartTotal)}</strong>
            </div>
          </section>

          {cart.length > 0 && canOrder && (
            <form className="stitch-panel stitch-checkout-form" onSubmit={handleSubmit}>
              <h3>{t("qr.checkoutTitle")}</h3>
              {error && <div className="stitch-alert stitch-alert--error">{error}</div>}
              <label>{t("qr.fullName")} *</label>
              <input
                className="stitch-input"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                required
              />
              <label>{t("qr.phone")} *</label>
              <input
                className="stitch-input"
                value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                required
              />
              <label>{t("qr.deliveryAddress")} *</label>
              <textarea
                className="stitch-input"
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder={t("qr.deliveryAddressPlaceholder")}
                required
              />
              <div className="stitch-checkout-location">
                <button type="button" className="stitch-btn-secondary" onClick={useMyLocation} disabled={locating}>
                  {locating ? t("qr.locating") : t("qr.useMyDeliveryLocation")}
                </button>
                {hasDeliveryLocation && <span className="stitch-success-text">{t("qr.deliveryLocationSet")}</span>}
              </div>
              <label>{t("qr.orderNote")}</label>
              <textarea
                className="stitch-input"
                rows={2}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
              <button type="submit" className="stitch-btn-checkout" disabled={submitting}>
                {submitting ? t("qr.sending") : t("qr.sendOrder", { total: money(cartTotal) })}
              </button>
            </form>
          )}

          {cart.length > 0 && !canOrder && (
            <div className="stitch-panel stitch-alert">
              {branch?.isOpen === false ? t("qr.closedNotice") : t("qr.viewOnlyNotice")}
            </div>
          )}
        </div>
      </div>
    </PublicQrShell>
  );
}
