import { useEffect, useRef, useState } from "react";
import { compressImageFile } from "../utils/compressImage";
import { getProductImageSrc } from "../utils/productImage";

export default function ProductImageField({ product, value, onChange }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (value === null) {
      setPreview(null);
      return;
    }
    if (value?.previewUrl) {
      setPreview(value.previewUrl);
      return;
    }
    if (product?.hasImage && value !== null) {
      setPreview(getProductImageSrc(product));
    }
  }, [product, value]);

  const handleFile = async (file) => {
    if (!file) return;
    setError("");
    try {
      const compressed = await compressImageFile(file);
      onChange(compressed);
      setPreview(compressed.previewUrl);
    } catch (err) {
      setError(err.message || "Resim yüklenemedi.");
    }
  };

  const handleRemove = () => {
    setError("");
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="product-image-field">
      <div className="product-image-field__preview">
        {preview ? (
          <img src={preview} alt="Ürün önizleme" />
        ) : (
          <div className="product-image-field__placeholder">
            <i className="fa fa-picture-o" />
            <span>Resim yok</span>
          </div>
        )}
      </div>

      <div className="product-image-field__actions">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <button type="button" className="btn btn-default btn-sm" onClick={() => inputRef.current?.click()}>
          <i className="fa fa-upload" /> Resim Yükle
        </button>
        {preview && (
          <button type="button" className="btn btn-warning btn-sm" onClick={handleRemove}>
            Resmi Kaldır
          </button>
        )}
      </div>

      <p className="product-image-field__hint">Opsiyonel. JPG, PNG, WEBP veya GIF — en fazla 2MB.</p>
      {error && <p className="product-image-field__error">{error}</p>}
    </div>
  );
}
