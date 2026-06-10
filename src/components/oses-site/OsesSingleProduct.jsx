import { useState } from "react";
import { useLocale } from "../../context/LocaleContext";
import { seedImageForProduct } from "../../utils/cigkofteSiteImages";

export default function OsesSingleProduct({ product, imageSrc, priceLabel, canOrder, onAdd }) {
  const { t } = useLocale();
  const [added, setAdded] = useState(false);
  const src = imageSrc || seedImageForProduct(product);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!canOrder) return;
    onAdd?.();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="single-product">
      {src ? <img src={src} className="img-fluid" alt={product.name} /> : null}
      <h2 className="title18 mt-2 mb-0">{product.name}</h2>
      {product.unit && <p>{product.unit}</p>}
      <form className="mt-3" onSubmit={handleAdd}>
        <div className="row align-items-center">
          <p className="price col-5 col-md-4">{priceLabel}</p>
          <div className="col-7 col-md-8">
            {canOrder && (
              <button type="submit" className="btn-add">
                {added ? t("qr.addedToCart") : t("qr.addToCart")}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
