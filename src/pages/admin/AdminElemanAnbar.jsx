import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { formatMoney } from "../../utils/format";
import "../../styles/eleman.css";

export default function AdminElemanAnbar() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState("");

  const load = () => api.getElemanProducts().then(setProducts);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const save = async (product, patch) => {
    setError("");
    setMessage("");
    setSaving(product.id);
    try {
      const next = await api.updateElemanProduct(product.id, { ...product, ...patch });
      setProducts((prev) => prev.map((item) => (item.id === next.id ? next : item)));
      setMessage("Anbar məhsulu yeniləndi.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving("");
    }
  };

  return (
    <div className="admin-page erp-page">
      <div className="crm-listbar">
        <div>
          <h2>Anbar</h2>
          <span>Əlman anbarındakı məhsullar</span>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}
      <div className="el-grid">
        {products.map((product, index) => (
          <article key={product.id} className="el-tile" style={{ cursor: "default" }}>
            <span>
              {index + 1}. {product.unit === "kq" ? "kq" : "ədəd"}
            </span>
            <strong>{product.name}</strong>
            <label className="el-field">
              <span>Qiymət</span>
              <input
                type="number"
                min="0"
                step="0.01"
                defaultValue={product.price}
                disabled={saving === product.id}
                onBlur={(e) => {
                  if (Number(e.target.value) !== Number(product.price)) save(product, { price: e.target.value });
                }}
              />
            </label>
            <label className="el-field">
              <span>Franchise faiz %</span>
              <input
                type="number"
                min="0"
                step="0.01"
                defaultValue={product.franchisePercent || 0}
                disabled={saving === product.id}
                onBlur={(e) => {
                  if (Number(e.target.value) !== Number(product.franchisePercent || 0)) {
                    save(product, { franchisePercent: e.target.value });
                  }
                }}
              />
            </label>
            <small>
              {formatMoney(product.price)}
              {Number(product.franchisePercent) > 0
                ? ` · franchise +${Number(product.franchisePercent)}%`
                : ""}
            </small>
          </article>
        ))}
      </div>
    </div>
  );
}
