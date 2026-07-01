import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "../store/StoreContext";
import { api } from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import ProductImageField from "../components/ProductImageField";
import ProductGroupField from "../components/ProductGroupField";
import { DEFAULT_PRODUCT_UNIT, PRODUCT_UNITS } from "../data/productUnits";

const emptyForm = {
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
  const { state, addProduct, updateProduct, uploadProductImage, addGroup } = useStore();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const editId = params.get("id");
  const existing = state.products.find((p) => p.id === editId);
  const [form, setForm] = useState(emptyForm);
  const [imageValue, setImageValue] = useState(undefined);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setForm({ ...emptyForm, ...existing });
      setImageValue(undefined);
    } else {
      setForm(emptyForm);
      setImageValue(undefined);
    }
  }, [existing?.id]);

  useEffect(() => {
    if (existing || form.groupId || !state.groups[0]?.id) return;
    setForm((prev) => ({ ...prev, groupId: state.groups[0].id }));
  }, [existing, state.groups, form.groupId]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const buildProductPayload = () => ({
    name: form.name.trim(),
    groupId: form.groupId,
    stock: Number(form.stock),
    criticalStock: Number(form.criticalStock),
    vat: Number(form.vat),
    buyPrice: Number(form.buyPrice),
    price1: Number(form.price1),
    price2: Number(form.price2),
    unit: form.unit || DEFAULT_PRODUCT_UNIT,
    onSalePage: !!form.onSalePage,
  });

  const persistProductImage = async (productId) => {
    if (imageValue === undefined) return;

    if (imageValue === null) {
      await api.updateProduct(productId, { removeImage: true });
      return;
    }

    if (imageValue.file) {
      await uploadProductImage(productId, imageValue.file);
      return;
    }

    if (imageValue.data && imageValue.mime) {
      await api.updateProduct(productId, {
        imageData: imageValue.data,
        imageMime: imageValue.mime,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setMessage("Ürün adı zorunludur.");
      return;
    }
    if (!form.groupId) {
      setMessage("Kateqoriya / qrup seçin və ya yeni yaradın.");
      return;
    }
    if (imageValue && imageValue !== null && !imageValue.file && !imageValue.data) {
      setMessage("Resim hazırlanamadı. Lütfen tekrar seçin.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const payload = buildProductPayload();

      if (existing) {
        await updateProduct(existing.id, {
          ...payload,
          barcode: existing.barcode,
          stockCode: form.stockCode || existing.stockCode,
        });
        await persistProductImage(existing.id);
        setImageValue(undefined);
        setMessage("Ürün güncellendi.");
      } else {
        const created = await addProduct(payload);
        await persistProductImage(created.id);
        navigate("/products");
      }
    } catch (err) {
      setMessage(err.message || "Kayıt başarısız.");
    } finally {
      setSaving(false);
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
      {!existing && (
        <p className="hint-text" style={{ marginBottom: 12, color: "#666", fontSize: 13 }}>
          Barkod ve stok kodu kayıt sırasında otomatik oluşturulur.
        </p>
      )}
      <form className="card form-grid" onSubmit={handleSubmit}>
        {existing && (
          <>
            <label>Barkod</label>
            <input value={existing.barcode} readOnly disabled />
            <label>Stok Kodu</label>
            <input value={existing.stockCode || ""} readOnly disabled />
          </>
        )}

        <label>Ürün Resmi</label>
        <ProductImageField product={existing} value={imageValue} onChange={setImageValue} />

        <label>Ürün Adı *</label>
        <input value={form.name} onChange={(e) => setField("name", e.target.value)} required />

        <label>Kateqoriya / Qrup *</label>
        <ProductGroupField
          showLabel={false}
          value={form.groupId}
          groups={state.groups}
          onChange={(groupId) => setField("groupId", groupId)}
          onCreateGroup={addGroup}
        />

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
          <button type="submit" className="btn btn-success" disabled={saving}>
            {saving ? "Kaydediliyor..." : existing ? "Güncelle" : "Kaydet"}
          </button>
        </div>
      </form>
    </div>
  );
}
