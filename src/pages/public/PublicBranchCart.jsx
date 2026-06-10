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
      <div className="container my-5">
        <div className="row mb-4">
          <div className="col-12">
            <Link to={`/m/branch/${branchId}`} className="btn_box_line">
              ← {t("qr.nav.menu")}
            </Link>
            <h2 className="title32 txt_green mt-4">{t("qr.completeOrder")}</h2>
            <p>{t("qr.payOnDelivery")}</p>
          </div>
        </div>

        <div className="row">
          <div className="col-12 col-lg-6 mb-4">
            <h3 className="title18 txt_green">{t("qr.myCart")}</h3>
            {cart.length === 0 ? (
              <p>
                {t("qr.cartEmpty")}{" "}
                <Link to={`/m/branch/${branchId}`}>{t("qr.nav.menu")}</Link>
              </p>
            ) : (
              cart.map((line) => (
                <div key={line.productId} className="d-flex align-items-center mb-3 p-3" style={{ background: "#f8f8f8", borderRadius: 8 }}>
                  {line.imageUrl && (
                    <img src={line.imageUrl} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, marginRight: 12 }} />
                  )}
                  <div className="flex-grow-1">
                    <strong>{line.name}</strong>
                    <div className="price">{money(line.price * line.qty)}</div>
                    <div className="d-flex align-items-center mt-2">
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => updateQty(line.productId, line.qty - 1)}>
                        −
                      </button>
                      <span className="mx-2">{line.qty}</span>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => updateQty(line.productId, line.qty + 1)}>
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && canOrder && (
            <div className="col-12 col-lg-6">
              <form onSubmit={handleSubmit}>
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="form-group">
                  <label>{t("qr.fullName")} *</label>
                  <input className="form-control" required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{t("qr.phone")} *</label>
                  <input className="form-control" required value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{t("qr.deliveryAddress")} *</label>
                  <textarea className="form-control" rows={3} required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <button type="button" className="btn_box_line mb-3" onClick={useMyLocation} disabled={locating}>
                  {locating ? t("qr.locating") : t("qr.useMyDeliveryLocation")}
                </button>
                <div className="form-group">
                  <label>{t("qr.orderNote")}</label>
                  <textarea className="form-control" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <span>{t("common.total")}</span>
                  <strong className="price">{money(cartTotal)}</strong>
                </div>
                <button type="submit" className="btn_box_green btn_box width-100" disabled={submitting}>
                  {submitting ? t("qr.sending") : t("qr.sendOrder", { total: money(cartTotal) })}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </PublicQrShell>
  );
}
