import { useEffect, useRef, useState } from "react";
import { compressImageFile } from "../../utils/compressImage";
import { getProductImageSrc } from "../../utils/productImage";
import { useAuth } from "../../context/AuthContext";
import { PRODUCT_UNITS } from "../../data/productUnits";
import "../../styles/mobile-product-form.css";

export default function MobileProductForm({
  existing,
  form,
  setField,
  imageValue,
  setImageValue,
  message,
  setMessage,
  saving,
  saveProduct,
  removeProduct,
  lookupBarcode,
  profitPercent,
  setProfitPercent,
  adjustStock,
  navigate,
  groups,
}) {
  const { activeBranchName, user } = useAuth();
  const imageRef = useRef(null);
  const barcodeRef = useRef(null);
  const [barcodeQuery, setBarcodeQuery] = useState(existing?.barcode || "");
  const [showForm, setShowForm] = useState(!!existing);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState("");

  const branchLabel = activeBranchName || user?.branchName || "ANA HESAP";

  const handleImagePick = async (file) => {
    if (!file) return;
    setImageError("");
    try {
      const compressed = await compressImageFile(file);
      setImageValue(compressed);
      setImagePreview(compressed.previewUrl);
    } catch (err) {
      setImageError(err.message || "Resim yüklenemedi.");
    }
  };

  const handleFetch = () => {
    const product = lookupBarcode(barcodeQuery);
    if (product) {
      navigate(`/update?id=${product.id}`);
      return;
    }
    setShowForm(true);
    setMessage("Ürün bulunamadı. Yeni ürün olarak ekleyebilirsiniz.");
  };

  const handleNewBarcode = () => {
    setBarcodeQuery("");
    setShowForm(true);
    setMessage("");
  };

  const handleScan = () => {
    barcodeRef.current?.focus();
    barcodeRef.current?.select();
  };

  useEffect(() => {
    if (existing) {
      setShowForm(true);
      setBarcodeQuery(existing.barcode || "");
    }
  }, [existing?.id]);

  useEffect(() => {
    if (imageValue === null) {
      setImagePreview(null);
      return;
    }
    if (imageValue?.previewUrl) {
      setImagePreview(imageValue.previewUrl);
      return;
    }
    if (existing?.imageUrl) {
      setImagePreview(existing.imageUrl);
      return;
    }
    if (existing?.hasImage && imageValue === undefined) {
      setImagePreview(getProductImageSrc(existing));
    }
  }, [existing, imageValue]);

  return (
    <div className="mobile-product-form">
      <header className="mobile-product-form__hero">
        <button type="button" className="mobile-product-form__icon-btn" onClick={() => navigate(-1)} aria-label="Geri">
          <i className="fa fa-arrow-left" />
        </button>
        <h1>Ürün Ekle / Güncelle</h1>
        <button
          type="button"
          className="mobile-product-form__icon-btn"
          onClick={() => imageRef.current?.click()}
          aria-label="Resim ekle"
        >
          <i className="fa fa-camera" />
        </button>
        <input
          ref={imageRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          hidden
          onChange={(e) => handleImagePick(e.target.files?.[0])}
        />
      </header>

      {!existing && (
        <div className="mobile-product-form__barcode-bar">
          <input
            ref={barcodeRef}
            value={barcodeQuery}
            onChange={(e) => setBarcodeQuery(e.target.value)}
            placeholder="Ürün barkodu"
            onKeyDown={(e) => e.key === "Enter" && handleFetch()}
          />
          <button type="button" className="mobile-product-form__fetch" onClick={handleFetch}>
            <i className="fa fa-search" /> Getir
          </button>
          <button type="button" className="mobile-product-form__new-code" onClick={handleNewBarcode}>
            Yeni barkod
          </button>
        </div>
      )}

      {!showForm && !existing ? (
        <section className="mobile-product-form__empty">
          <h2>Ürün Bilgisi</h2>
          <p>
            Eklemek / görüntülemek istediğiniz ürünün barkodunu okutun veya elle girerek getir düğmesine tıklayın
          </p>
          <div className="mobile-product-form__empty-icon">
            <i className="fa fa-image" />
          </div>
        </section>
      ) : (
        <form
          className="mobile-product-form__body"
          onSubmit={(e) => {
            e.preventDefault();
            saveProduct();
          }}
        >
          <div className="mobile-product-form__photo" onClick={() => imageRef.current?.click()} role="presentation">
            {imagePreview || (existing && getProductImageSrc(existing)) ? (
              <img src={imagePreview || getProductImageSrc(existing)} alt="" />
            ) : (
              <i className="fa fa-image" />
            )}
          </div>
          {imageError && <p className="mobile-product-form__error">{imageError}</p>}

          <label className="mobile-product-form__field mobile-product-form__field--inline">
            <span>Ürün barkodu :</span>
            <input value={existing?.barcode || barcodeQuery || "Otomatik"} readOnly disabled />
          </label>

          <label className="mobile-product-form__field">
            <span>Ürün adı</span>
            <input value={form.name} onChange={(e) => setField("name", e.target.value)} required />
          </label>

          <div className="mobile-product-form__row mobile-product-form__row--2">
            <label className="mobile-product-form__field">
              <span>Fiyat 1</span>
              <div className="mobile-product-form__money">
                <input
                  type="number"
                  step="0.01"
                  value={form.price1}
                  onChange={(e) => setField("price1", e.target.value)}
                />
                <span>₺</span>
              </div>
            </label>
            <label className="mobile-product-form__field">
              <span>Alış fiyatı</span>
              <div className="mobile-product-form__money">
                <input
                  type="number"
                  step="0.01"
                  value={form.buyPrice}
                  onChange={(e) => setField("buyPrice", e.target.value)}
                />
                <span>₺</span>
              </div>
            </label>
          </div>

          <div className="mobile-product-form__row mobile-product-form__row--3">
            <label className="mobile-product-form__field">
              <span>Kâr ...</span>
              <input value={profitPercent()} onChange={(e) => setProfitPercent(e.target.value)} placeholder="%" />
            </label>
            <label className="mobile-product-form__field">
              <span>KDV...</span>
              <input type="number" value={form.vat} onChange={(e) => setField("vat", e.target.value)} />
            </label>
            <label className="mobile-product-form__field mobile-product-form__field--stock">
              <span>Stok</span>
              <div className="mobile-product-form__stepper">
                <button type="button" onClick={() => adjustStock(-1)}>
                  −
                </button>
                <input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setField("stock", e.target.value)}
                />
                <button type="button" onClick={() => adjustStock(1)}>
                  +
                </button>
              </div>
            </label>
          </div>

          <div className="mobile-product-form__row mobile-product-form__row--selects">
            <label className="mobile-product-form__field">
              <span>Satış ekranında</span>
              <select
                value={form.onSalePage ? "yes" : "no"}
                onChange={(e) => setField("onSalePage", e.target.value === "yes")}
              >
                <option value="yes">Evet</option>
                <option value="no">Hayır</option>
              </select>
            </label>
            <label className="mobile-product-form__field">
              <span>Grup</span>
              <select value={form.groupId} onChange={(e) => setField("groupId", e.target.value)}>
                <option value="">Grupsuz ürün</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mobile-product-form__branch">
            <span>Değişikliğin Yapılacağı Şube</span>
            <strong>{branchLabel.toUpperCase()}</strong>
          </div>

          <button
            type="button"
            className="mobile-product-form__details-toggle"
            onClick={() => setDetailsOpen((open) => !open)}
          >
            Diğer detaylar <i className={`fa fa-chevron-${detailsOpen ? "up" : "down"}`} />
          </button>

          {detailsOpen && (
            <div className="mobile-product-form__details">
              <label className="mobile-product-form__field">
                <span>Fiyat 2</span>
                <input type="number" step="0.01" value={form.price2} onChange={(e) => setField("price2", e.target.value)} />
              </label>
              <label className="mobile-product-form__field">
                <span>Kritik stok</span>
                <input
                  type="number"
                  value={form.criticalStock}
                  onChange={(e) => setField("criticalStock", e.target.value)}
                />
              </label>
              <label className="mobile-product-form__field">
                <span>Birim</span>
                <select value={form.unit} onChange={(e) => setField("unit", e.target.value)}>
                  {PRODUCT_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>
              {existing?.stockCode && (
                <label className="mobile-product-form__field">
                  <span>Stok kodu</span>
                  <input value={existing.stockCode} readOnly disabled />
                </label>
              )}
            </div>
          )}

          {message && <p className="mobile-product-form__message">{message}</p>}

          <div className={`mobile-product-form__actions${existing ? "" : " mobile-product-form__actions--single"}`}>
            {existing && (
              <button type="button" className="mobile-product-form__delete" disabled={saving} onClick={removeProduct}>
                <i className="fa fa-trash" /> Sil
              </button>
            )}
            <button type="submit" className="mobile-product-form__save" disabled={saving}>
              <i className="fa fa-check" /> {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      )}

      <button type="button" className="mobile-product-form__scan" onClick={handleScan}>
        <i className="fa fa-qrcode" />
        Tara
      </button>
    </div>
  );
}
