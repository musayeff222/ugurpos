import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { compressInvoiceImage, parseAmount } from "../../utils/compressImage";
import { formatDateTime, formatMoney } from "../../utils/format";
import ElemanInvoiceScreen from "./ElemanInvoiceScreen";

export default function ElemanAlis() {
  const { user } = useAuth();
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [data, setData] = useState(null);
  const [cart, setCart] = useState([]);
  const [payOpen, setPayOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const personName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.staffName || "";

  const load = () => api.getElemanOverview().then(setData);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const products = data?.products || [];
  const total = useMemo(
    () => cart.reduce((sum, line) => sum + parseAmount(line.qty) * parseAmount(line.price), 0),
    [cart]
  );
  const ready = cart.length > 0 && cart.every((line) => parseAmount(line.qty) > 0 && parseAmount(line.price) > 0);

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

  const pickFile = async (next) => {
    setError("");
    if (!next) {
      setFile(null);
      setPreview("");
      return;
    }
    try {
      const prepared = await compressInvoiceImage(next);
      if (preview) URL.revokeObjectURL(preview);
      setFile(prepared);
      setPreview(URL.createObjectURL(prepared));
    } catch (err) {
      setFile(null);
      setPreview("");
      setError(err.message || "Şəkil oxunmadı.");
    }
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
      const created = await api.createElemanPurchase(
        {
          lines: cart.map((line) => ({
            ...line,
            qty: parseAmount(line.qty),
            price: parseAmount(line.price),
          })),
        },
        file
      );
      setCart([]);
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview("");
      setPayOpen(false);
      await load();
      setMessage("Alış qeydə alındı. Məbləğ kassadan çıxıldı.");
      setInvoice(created);
    } catch (err) {
      setError(err.message || "Alış alınmadı. Şəkli yenidən seçib ödəyin.");
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
      {error && !payOpen && <div className="alert alert-danger">{error}</div>}
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
                <b>{formatMoney(parseAmount(line.qty) * parseAmount(line.price))}</b>
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
            <span>{formatDateTime(row.createdAt, "az")}</span>
            <b>{formatMoney(row.total)}</b>
          </button>
        ))}
        {!data?.purchases?.length && <p>Alış yoxdur.</p>}
      </section>

      {payOpen ? (
        <div className="el-full">
          <header className="el-full__bar">
            <button type="button" className="el-full__back" onClick={() => !saving && setPayOpen(false)}>
              Geri
            </button>
            <h2>Ödəniş</h2>
          </header>
          <form className="el-full__body" onSubmit={pay}>
            {error && <div className="alert alert-danger">{error}</div>}
            <p>
              Ümumi <strong>{formatMoney(total)}</strong> kassadan çıxılacaq.
            </p>
            <ul className="el-full__lines">
              {cart.map((line) => (
                <li key={line.productId}>
                  {line.qty} {line.unit === "kq" ? "kq" : "ədəd"} {line.name} · {formatMoney(parseAmount(line.price))}
                </li>
              ))}
            </ul>
            <div className="el-upload">
              <span>Faktura şəkli</span>
              {preview ? <img src={preview} alt="Faktura" /> : <div className="el-upload__empty">Şəkil seçilməyib</div>}
              <div className="el-upload__btns">
                <button type="button" className="el-login__submit" onClick={() => cameraRef.current?.click()}>
                  Kameradan çək
                </button>
                <button type="button" className="el-login__submit el-login__submit--ghost" onClick={() => galleryRef.current?.click()}>
                  Qalereyadan seç
                </button>
              </div>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => pickFile(e.target.files?.[0] || null)}
              />
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => pickFile(e.target.files?.[0] || null)}
              />
            </div>
            <button type="submit" className="el-login__submit" disabled={saving || !file}>
              {saving ? "Ödənilir..." : `Ödə · ${formatMoney(total)}`}
            </button>
          </form>
        </div>
      ) : null}

      {invoice ? (
        <ElemanInvoiceScreen
          purchase={invoice}
          personName={personName}
          storeName={user?.firmName}
          onClose={() => setInvoice(null)}
        />
      ) : null}
    </div>
  );
}
