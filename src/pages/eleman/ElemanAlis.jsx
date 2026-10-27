import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import Modal from "../../components/ui/Modal";
import { formatDateTime, formatMoney } from "../../utils/format";

export default function ElemanAlis() {
  const [data, setData] = useState(null);
  const [cart, setCart] = useState([]);
  const [payOpen, setPayOpen] = useState(false);
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
  const total = useMemo(
    () => cart.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.price || 0), 0),
    [cart]
  );
  const ready = cart.length > 0 && cart.every((line) => Number(line.qty) > 0 && Number(line.price) > 0);

  const toggle = (product) => {
    setCart((prev) => {
      if (prev.some((line) => line.productId === product.id)) {
        return prev.filter((line) => line.productId !== product.id);
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          qty: 1,
          price: product.price > 0 ? String(product.price) : "",
        },
      ];
    });
  };

  const patchLine = (productId, patch) => {
    setCart((prev) => prev.map((line) => (line.productId === productId ? { ...line, ...patch } : line)));
  };

  const pay = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!ready) {
      setError("Hər məhsulun sayını və alış qiymətini yazın.");
      return;
    }
    if (!file) {
      setError("Faktura şəklini yükləyin.");
      return;
    }
    setSaving(true);
    try {
      const uploaded = await api.uploadElemanInvoice(file);
      await api.createElemanPurchase({
        lines: cart.map((line) => ({ ...line, qty: Number(line.qty), price: Number(line.price) })),
        invoiceUrl: uploaded.invoiceUrl,
      });
      setCart([]);
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
      <div className="el-pagehead">
        <div>
          <h2>Alış</h2>
          <p>Məhsulu seçin, sayını və alış qiymətini yazın.</p>
        </div>
        <b>Kassa {formatMoney(data?.balance || 0)}</b>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}
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
          <h3>Səbət · {cart.length} məhsul</h3>
          {cart.map((line) => (
            <article key={line.productId} className="el-cart__line">
              <div className="el-cart__name">
                <strong>{line.name}</strong>
                <small>{line.unit === "kq" ? "kq" : "ədəd"}</small>
              </div>
              <label className="el-field">
                <span>Say</span>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  inputMode="decimal"
                  value={line.qty}
                  onChange={(e) => patchLine(line.productId, { qty: e.target.value })}
                />
              </label>
              <label className="el-field">
                <span>Alış qiyməti</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={line.price}
                  placeholder="0.00"
                  onChange={(e) => patchLine(line.productId, { price: e.target.value })}
                />
              </label>
              <div className="el-cart__sum">
                <span>Cəm</span>
                <b>{formatMoney(Number(line.qty || 0) * Number(line.price || 0))}</b>
                <button type="button" className="btn btn-sm" onClick={() => toggle({ id: line.productId })}>
                  Sil
                </button>
              </div>
            </article>
          ))}
          <footer className="el-cart__total">
            <span>Ümumi</span>
            <strong>{formatMoney(total)}</strong>
          </footer>
        </div>
      )}

      <div className="el-paybar">
        <button type="button" className="el-login__submit" disabled={!ready} onClick={() => setPayOpen(true)}>
          Ödəniş · {formatMoney(total)}
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
          <p>
            Ümumi <strong>{formatMoney(total)}</strong> kassadan çıxılacaq.
          </p>
          <ul>
            {cart.map((line) => (
              <li key={line.productId}>
                {line.qty} {line.unit === "kq" ? "kq" : "ədəd"} {line.name} · {formatMoney(line.price)}
              </li>
            ))}
          </ul>
          <label className="el-field">
            <span>Faktura şəkli</span>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
          </label>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setPayOpen(false)}>
              Bağla
            </button>
            <button type="submit" className="el-login__submit" disabled={saving}>
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
                  {line.qty} {line.unit} {line.name} · {formatMoney(line.price)} ={" "}
                  {formatMoney(Number(line.qty || 0) * Number(line.price || 0))}
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
