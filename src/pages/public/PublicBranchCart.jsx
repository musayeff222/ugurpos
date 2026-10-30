import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import { useLocale } from "../../context/LocaleContext";
import { formatPublicMoney } from "../../utils/publicMoney";
import { requestUserLocation } from "../../utils/geo";
import { fetchPublicBranchMenu, submitPublicOrder } from "../../utils/qrMenuPublic";
import { loadBranchCart, saveBranchCart, rememberOrder, saveLastBranchId } from "../../utils/qrMenuStorage";

export default function PublicBranchCart() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const { t } = useLocale();
  const [menu, setMenu] = useState(null);
  const [cart, setCart] = useState(() => loadBranchCart(branchId));
  const [form, setForm] = useState({ customerName: "", customerPhone: "", address: "", note: "", lat: "", lng: "" });
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
  const money = (v) => formatPublicMoney(v);

  const updateQty = (productId, qty) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((line) => line.productId !== productId);
      return prev.map((line) => (line.productId === productId ? { ...line, qty } : line));
    });
  };

  const useMyLocation = async () => {
    setLocating(true);
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
    if (!form.customerName.trim() || !form.customerPhone.trim() || !form.address.trim() || !cart.length || !menu) return;
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
  const canOrder = branch?.menuAcceptOrders && branch?.isOpen !== false;

  return (
    <PublicQrShell firm={menu?.firm}>
      <div className="ps-wrap" style={{ paddingTop: 28 }}>
        <Link to={`/m/branch/${branchId}`} className="ps-btn-ghost">
          ← {t("qr.nav.menu")}
        </Link>
        <h2 style={{ margin: "20px 0 6px" }}>{t("qr.completeOrder")}</h2>
        <p className="ps-section__lead">{t("qr.payOnDelivery")}</p>

        <div className="ps-cart-layout">
          <div>
            <h3>{t("qr.myCart")}</h3>
            {cart.length === 0 ? (
              <p>
                {t("qr.cartEmpty")} <Link to={`/m/branch/${branchId}`}>{t("qr.nav.menu")}</Link>
              </p>
            ) : (
              cart.map((line) => (
                <div key={line.productId} className="ps-cart-line">
                  {line.imageUrl ? <img src={line.imageUrl} alt="" /> : null}
                  <div>
                    <strong>{line.name}</strong>
                    <div className="ps-price">{money(line.price * line.qty)}</div>
                    <div className="ps-qty">
                      <button type="button" onClick={() => updateQty(line.productId, line.qty - 1)}>
                        −
                      </button>
                      <span>{line.qty}</span>
                      <button type="button" onClick={() => updateQty(line.productId, line.qty + 1)}>
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && canOrder && (
            <form className="ps-form" onSubmit={handleSubmit}>
              {error ? <div className="ps-alert">{error}</div> : null}
              <label>{t("qr.fullName")} *</label>
              <input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              <label>{t("qr.phone")} *</label>
              <input required value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
              <label>{t("qr.deliveryAddress")} *</label>
              <textarea rows={3} required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <button type="button" className="ps-btn-ghost" onClick={useMyLocation} disabled={locating}>
                {locating ? t("qr.locating") : t("qr.useMyDeliveryLocation")}
              </button>
              <label>{t("qr.orderNote")}</label>
              <textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              <div className="ps-total">
                <span>{t("common.total")}</span>
                <strong>{money(cartTotal)}</strong>
              </div>
              <button type="submit" className="ps-btn" disabled={submitting}>
                {submitting ? t("qr.sending") : t("qr.sendOrder", { total: money(cartTotal) })}
              </button>
            </form>
          )}
        </div>
      </div>
    </PublicQrShell>
  );
}
