import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "../store/StoreContext";
import PageHeader from "../components/ui/PageHeader";
import { DEFAULT_PRODUCT_UNIT, PRODUCT_UNITS } from "../data/productUnits";

const emptyForm = {
  barcode: "",
  stockCode: "",
  name: "",
  groupId: "",
  unit: DEFAULT_PRODUCT_UNIT,
  stock: 0,
  criticalStock: 5,
  vat: 20,
  buyPrice: 0,
  price1: 0,
  price2: 0,
  onSalePage: true,
};

export default function ProductForm() {
  const { state, addProduct, updateProduct } = useStore();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const editId = params.get("id");
  const existing = state.products.find((p) => p.id === editId);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (existing) setForm({ ...emptyForm, ...existing });
  }, [existing]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.barcode.trim()) {
      setMessage("Ürün adı ve barkod zorunludur.");
      return;
    }
    const payload = {
      ...form,
      stock: Number(form.stock),
      criticalStock: Number(form.criticalStock),
      vat: Number(form.vat),
      buyPrice: Number(form.buyPrice),
      price1: Number(form.price1),
      price2: Number(form.price2),
      groupId: form.groupId || state.groups[0]?.id,
    };
    try {
      if (existing) {
        await updateProduct(existing.id, payload);
        setMessage("Ürün güncellendi.");
      } else {
        await addProduct(payload);
        navigate("/products");
      }
    } catch (err) {
      setMessage(err.message || "Kayıt başarısız.");
    }
  };

  return (
    <div>
      <PageHeader
        title={existing ? "Ürün Ekle & Güncelle" : "Yeni Ürün Ekle"}
        actions={
          <Link to="/products" className="btn btn-default">
            Geri
          </Link>
        }
      />
      {message && <div className="alert alert-info">{message}</div>}
      <form className="card form-grid" onSubmit={handleSubmit}>
        <label>Barkod *</label>
        <input value={form.barcode} onChange={(e) => setField("barcode", e.target.value)} required />

        <label>Stok Kodu</label>
        <input value={form.stockCode} onChange={(e) => setField("stockCode", e.target.value)} />

        <label>Ürün Adı *</label>
        <input value={form.name} onChange={(e) => setField("name", e.target.value)} required />

        <label>Grup</label>
        <select value={form.groupId} onChange={(e) => setField("groupId", e.target.value)}>
          {state.groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <label>Ürün Birimi</label>
        <select value={form.unit} onChange={(e) => setField("unit", e.target.value)} required>
          {PRODUCT_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>

        <label>Stok</label>
        <input type="number" value={form.stock} onChange={(e) => setField("stock", e.target.value)} />

        <label>Kritik Stok</label>
        <input type="number" value={form.criticalStock} onChange={(e) => setField("criticalStock", e.target.value)} />

        <label>KDV %</label>
        <input type="number" value={form.vat} onChange={(e) => setField("vat", e.target.value)} />

        <label>Alış Fiyatı</label>
        <input type="number" step="0.01" value={form.buyPrice} onChange={(e) => setField("buyPrice", e.target.value)} />

        <label>Fiyat 1</label>
        <input type="number" step="0.01" value={form.price1} onChange={(e) => setField("price1", e.target.value)} />

        <label>Fiyat 2</label>
        <input type="number" step="0.01" value={form.price2} onChange={(e) => setField("price2", e.target.value)} />

        <label className="checkbox-row">
          <input type="checkbox" checked={form.onSalePage} onChange={(e) => setField("onSalePage", e.target.checked)} />
          Satış sayfasında göster
        </label>

        <div className="form-actions">
          <button type="submit" className="btn btn-success">
            {existing ? "Güncelle" : "Kaydet"}
          </button>
        </div>
      </form>
    </div>
  );
}
