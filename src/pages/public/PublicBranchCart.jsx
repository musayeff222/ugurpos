import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import PublicBranchBar from "../../components/public/PublicBranchBar";
import StitchIcon from "../../components/public/StitchIcon";
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
      <div className="sf-container sf-checkout-page">
        <PublicBranchBar branch={branch} onBack={() => navigate(`/m/branch/${branchId}`)} />

        <div className="sf-page-head">
          <h2>{t("qr.completeOrder")}</h2>
          <p>{t("qr.checkoutSubtitle")}</p>
        </div>

        <div className="sf-checkout-grid">
          <div className="sf-checkout-main">
            <section className="sf-panel">
              <h3>
                <StitchIcon name="shopping_cart" /> {t("qr.myCart")} ({cartCount})
              </h3>
              {cart.length === 0 ? (
                <p className="sf-empty">{t("qr.cartEmpty")}</p>
              ) : (
                <div className="sf-cart-lines">
                  {cart.map((line) => (
                    <article key={line.productId} className="sf-cart-line">
                      <div className="sf-cart-line__media">
                        {line.imageUrl ? (
                          <img src={line.imageUrl} alt={line.name} />
                        ) : (
                          <div className="sf-cart-line__placeholder">
                            <StitchIcon name="restaurant" />
                          </div>
                        )}
                      </div>
                      <div className="sf-cart-line__body">
                        <div className="sf-cart-line__head">
                          <h4>{line.name}</h4>
                          <span>{money(line.price * line.qty)}</span>
                        </div>
                        <div className="sf-qty-pill">
                          <button type="button" onClick={() => updateQty(line.productId, line.qty - 1)} aria-label="-">
                            <StitchIcon name="remove" />
                          </button>
                          <span>{line.qty}</span>
                          <button type="button" onClick={() => updateQty(line.productId, line.qty + 1)} aria-label="+">
                            <StitchIcon name="add" />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <div className="sf-trust-badge">
              <StitchIcon name="verified_user" />
              <div>
                <strong>{t("qr.trustTitle")}</strong>
                <p>{t("qr.trustDesc")}</p>
              </div>
            </div>
          </div>

          {cart.length > 0 && canOrder && (
            <form className="sf-checkout-side" onSubmit={handleSubmit}>
              <section className="sf-panel">
                <h3>
                  <StitchIcon name="location_on" /> {t("qr.deliveryAddress")}
                </h3>
                {error && <div className="sf-alert">{error}</div>}
                <label>{t("qr.fullName")} *</label>
                <input
                  className="sf-input"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  required
                />
                <label>{t("qr.phone")} *</label>
                <input
                  className="sf-input"
                  value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  required
                />
                <label>{t("qr.deliveryAddress")} *</label>
                <textarea
                  className="sf-input"
                  rows={3}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder={t("qr.deliveryAddressPlaceholder")}
                  required
                />
                <div className="sf-checkout-location">
                  <button type="button" className="sf-btn-outline" onClick={useMyLocation} disabled={locating}>
                    <StitchIcon name="my_location" />
                    {locating ? t("qr.locating") : t("qr.useMyDeliveryLocation")}
                  </button>
                  {hasDeliveryLocation && <span className="sf-success">{t("qr.deliveryLocationSet")}</span>}
                </div>
                <label>{t("qr.orderNote")}</label>
                <textarea
                  className="sf-input"
                  rows={2}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </section>

              <section className="sf-panel sf-order-summary">
                <h3>{t("qr.orderSummary")}</h3>
                <div className="sf-order-summary__row">
                  <span>{t("qr.orderBranch", { branch: branchLabel })}</span>
                </div>
                <div className="sf-order-summary__row">
                  <span>{t("common.total")}</span>
                  <strong className="sf-order-summary__total">{money(cartTotal)}</strong>
                </div>
                <button type="submit" className="sf-btn-checkout" disabled={submitting}>
                  {submitting ? t("qr.sending") : t("qr.confirmOrder")}
                  <StitchIcon name="arrow_forward" />
                </button>
                <p className="sf-order-summary__legal">{t("qr.checkoutLegal")}</p>
              </section>
            </form>
          )}

          {cart.length > 0 && !canOrder && (
            <div className="sf-panel sf-alert">
              {branch?.isOpen === false ? t("qr.closedNotice") : t("qr.viewOnlyNotice")}
            </div>
          )}
        </div>
      </div>
    </PublicQrShell>
  );
}
