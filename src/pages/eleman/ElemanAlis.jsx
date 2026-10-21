import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import Modal from "../../components/ui/Modal";
import { formatDateTime, formatMoney } from "../../utils/format";

export default function ElemanAlis() {
  const [data, setData] = useState(null);
  const [cart, setCart] = useState([]);
  const [payOpen, setPayOpen] = useState(false);
  const [total, setTotal] = useState("");
  const [file, setFile] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => api.getElemanOverview().then(setData);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const products = data?.products || [];
  const amount = useMemo(() => cart.reduce((sum, line) => sum + Number(line.qty || 0), 0), [cart]);

  const toggle = (product) => {
    setCart((prev) => {
      if (prev.some((line) => line.productId === product.id)) {
        return prev.filter((line) => line.productId !== product.id);
      }
      return [...prev, { productId: product.id, name: product.name, unit: product.unit, qty: 1 }];
    });
  };

  const setQty = (productId, qty) => {
    setCart((prev) => prev.map((line) => (line.productId === productId ? { ...line, qty } : line)));
  };

  const pay = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!file) {
      setError("Faktura şəklini yükləyin.");
      return;
    }
    setSaving(true);
    try {
      const uploaded = await api.uploadElemanInvoice(file);
      await api.createElemanPurchase({
        lines: cart,
        total: Number(total),
        invoiceUrl: uploaded.invoiceUrl,
      });
      setCart([]);
      setTotal("");
      setFile(null);
      setPayOpen(false);
      await load();
      setMessage("Alış qeydə alındı. Məbləğ kassadan çıxıldı.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="el-page">
      <h2>Alış</h2>
      <p>Anbar məhsullarını seçin, sonra ödəniş edin.</p>
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}
      <p>
        Kassa: <strong>{formatMoney(data?.balance || 0)}</strong>
      </p>
      <div className="el-grid">
        {products.map((product) => {
          const picked = cart.find((line) => line.productId === product.id);
          return (
            <button
              key={product.id}
              type="button"
              className={picked ? "el-tile is-on" : "el-tile"}
              onClick={() => toggle(product)}
            >
              <span>{product.unit === "kq" ? "kq" : "ədəd"}</span>
              <strong>{product.name}</strong>
              <small>Anbar: {product.stock || 0}</small>
            </button>
          );
        })}
      </div>

      {cart.length > 0 && (
        <div className="el-cart">
          <h3>Səbət · {amount} məhsul</h3>
          {cart.map((line) => (
            <article key={line.productId}>
              <div>
                <strong>{line.name}</strong>
                <small>
                  {" "}
                  {line.unit === "kq" ? "kq" : "ədəd"}
                </small>
              </div>
              <div className="el-qty">
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={line.qty}
                  onChange={(e) => setQty(line.productId, e.target.value)}
                />
                <button type="button" className="btn btn-sm" onClick={() => toggle({ id: line.productId })}>
                  Sil
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="el-paybar">
        <button type="button" className="btn btn-primary" disabled={!cart.length} onClick={() => setPayOpen(true)}>
          Ödəniş
        </button>
      </div>

      <section className="el-history">
        <h3>Alış tarixçəsi</h3>
        {(data?.purchases || []).map((row) => (
          <button key={row.id} type="button" onClick={() => setInvoice(row)}>
            <span>{formatDateTime(row.createdAt)}</span>
            <b>{formatMoney(row.total)}</b>
          </button>
        ))}
        {!data?.purchases?.length && <p>Alış yoxdur.</p>}
      </section>

      <Modal open={payOpen} title="Ödəniş" onClose={() => setPayOpen(false)}>
        <form onSubmit={pay}>
          <label className="el-field">
            <span>Ümumi məbləğ</span>
            <input type="number" min="0.01" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} required />
          </label>
          <label className="el-field">
            <span>Faktura şəkli</span>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
          </label>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setPayOpen(false)}>
              Bağla
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Ödənilir..." : "Ödə"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(invoice)} title="Alış fakturası" onClose={() => setInvoice(null)} size="lg">
        {invoice && (
          <div>
            <p>
              {formatDateTime(invoice.createdAt)} · {formatMoney(invoice.total)}
            </p>
            <ul>
              {(invoice.lines || []).map((line, index) => (
                <li key={`${line.productId}-${index}`}>
                  {line.qty} {line.unit} {line.name}
                </li>
              ))}
            </ul>
            {invoice.invoiceUrl ? (
              <p>
                <a href={invoice.invoiceUrl} target="_blank" rel="noreferrer">
                  Faktura şəkli
                </a>
              </p>
            ) : null}
          </div>
        )}
      </Modal>
    </div>
  );
}
