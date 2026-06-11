import { useEffect, useRef, useState } from "react";
import { compressImageFile } from "../../utils/compressImage";
import { getWebImagePreviewUrl } from "../../utils/menuWebConfig";

export default function WebImageField({ label, hint, imageKey, url, onUrlChange, upload, onUploadChange }) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const preview = getWebImagePreviewUrl(url, upload);

  useEffect(() => {
    if (!upload && !url) return;
  }, [upload, url]);

  const handleFile = async (file) => {
    if (!file) return;
    setError("");
    try {
      const compressed = await compressImageFile(file, 1600, 0.86);
      onUploadChange?.(imageKey, compressed);
    } catch (err) {
      setError(err.message || "Resim yüklenemedi.");
    }
  };

  const clearUpload = () => {
    setError("");
    onUploadChange?.(imageKey, null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="web-image-field">
      {label ? <label>{label}</label> : null}
      <div className="web-image-field__preview">
        {preview ? (
          <img src={preview} alt="" />
        ) : (
          <div className="web-image-field__placeholder">
            <i className="fa fa-picture-o" />
          </div>
        )}
      </div>
      <input
        type="text"
        placeholder="/uploads/... veya https://..."
        value={url || ""}
        onChange={(e) => onUrlChange(e.target.value)}
      />
      <div className="web-image-field__actions">
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
        {upload && (
          <button type="button" className="btn btn-warning btn-sm" onClick={clearUpload}>
            Yüklemeyi İptal
          </button>
        )}
      </div>
      {hint ? <p className="hint-text">{hint}</p> : null}
      {error ? <p className="product-image-field__error">{error}</p> : null}
    </div>
  );
}
