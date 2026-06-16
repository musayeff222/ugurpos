import { Link } from "react-router-dom";
import useIsDesktop from "../hooks/useIsDesktop";
import useProductForm from "../hooks/useProductForm";
import MobileProductForm from "../components/products/MobileProductForm";
import PageHeader from "../components/ui/PageHeader";
import ProductImageField from "../components/ProductImageField";
import { PRODUCT_UNITS } from "../data/productUnits";

export default function ProductForm() {
  const isDesktop = useIsDesktop();
  const formApi = useProductForm();
  const {
    state,
    existing,
    form,
    setField,
    imageValue,
    setImageValue,
    message,
    setMessage,
    saving,
    saveProduct,
    lookupBarcode,
    profitPercent,
    setProfitPercent,
    adjustStock,
    navigate,
  } = formApi;

  if (!isDesktop) {
    return (
      <MobileProductForm
        existing={existing}
        form={form}
        setField={setField}
        imageValue={imageValue}
        setImageValue={setImageValue}
        message={message}
        setMessage={setMessage}
        saving={saving}
        saveProduct={saveProduct}
        removeProduct={formApi.removeProduct}
        lookupBarcode={lookupBarcode}
        profitPercent={profitPercent}
        setProfitPercent={setProfitPercent}
        adjustStock={adjustStock}
        navigate={navigate}
        groups={state.groups}
      />
    );
  }

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
      <form
        className="card form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          saveProduct();
        }}
      >
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
          <button type="submit" className="btn btn-success" disabled={saving}>
            {saving ? "Kaydediliyor..." : existing ? "Güncelle" : "Kaydet"}
          </button>
        </div>
      </form>
    </div>
  );
}
