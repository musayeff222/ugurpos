import { useState } from "react";
import { useLocale } from "../../context/LocaleContext";
import { seedImageForProduct } from "../../utils/cigkofteSiteImages";

export default function OsesSingleProduct({ product, imageSrc, priceLabel, canOrder, onAdd }) {
  const { t } = useLocale();
  const [added, setAdded] = useState(false);
  const src = imageSrc || seedImageForProduct(product);

  const handleAdd = () => {
    if (!canOrder) return;
    onAdd?.();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <article className="ps-product">
      <div className="ps-product__media">{src ? <img src={src} alt={product.name} /> : null}</div>
      <div className="ps-product__body">
        <h3>{product.name}</h3>
        {product.unit ? <p className="ps-product__unit">{product.unit}</p> : null}
        <div className="ps-product__row">
          <span className="ps-price">{priceLabel}</span>
          {canOrder ? (
            <button type="button" className="ps-btn" onClick={handleAdd}>
              {added ? t("qr.addedToCart") : t("qr.addToCart")}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
