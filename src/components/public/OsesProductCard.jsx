import { useState } from "react";
import { useLocale } from "../../context/LocaleContext";
import { seedImageForProduct } from "../../utils/cigkofteSiteImages";

function ProductImage({ src, alt, product }) {
  const [failed, setFailed] = useState(false);
  const resolved = !failed && src ? src : seedImageForProduct(product);

  if (!resolved) {
    return (
      <div className="oses-product-card__placeholder">
        <i className="fa fa-cutlery" />
      </div>
    );
  }

  return <img src={resolved} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

export default function OsesProductCard({ product, imageSrc, priceLabel, canOrder, onAdd }) {
  const { t } = useLocale();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    if (!canOrder) return;
    onAdd?.();
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <article className="oses-product-card">
      <div className="oses-product-card__img">
        <ProductImage src={imageSrc} alt={product.name} product={product} />
      </div>
      <div className="oses-product-card__body">
        <h3>{product.name}</h3>
        {product.unit && <p className="oses-product-card__unit">{product.unit}</p>}
        <p className="oses-product-card__price">{priceLabel}</p>
        {canOrder && (
          <button type="button" className={`oses-product-card__btn${added ? " is-added" : ""}`} onClick={handleAdd}>
            <i className={`fa fa-${added ? "check" : "plus"}`} />
            {added ? t("qr.addedToCart") : t("qr.addToCart")}
          </button>
        )}
      </div>
    </article>
  );
}
