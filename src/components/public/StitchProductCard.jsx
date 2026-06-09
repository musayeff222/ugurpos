import { useState } from "react";
import { useLocale } from "../../context/LocaleContext";

export default function StitchProductCard({
  product,
  imageSrc,
  priceLabel,
  canOrder,
  onAdd,
  layout = "grid",
}) {
  const { t } = useLocale();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    if (!canOrder) return;
    onAdd?.();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  if (layout === "row") {
    return (
      <article className="stitch-product-row">
        <div className="stitch-product-row__media">
          {imageSrc ? (
            <img src={imageSrc} alt={product.name} loading="lazy" />
          ) : (
            <div className="stitch-product-row__placeholder">
              <i className="fa fa-cutlery" />
            </div>
          )}
        </div>
        <div className="stitch-product-row__body">
          <div>
            <h4>{product.name}</h4>
            <p className="stitch-product-row__price">{priceLabel}</p>
          </div>
          {canOrder && (
            <button
              type="button"
              className={`stitch-icon-add ${added ? "is-added" : ""}`}
              onClick={handleAdd}
              aria-label={t("qr.addToCart")}
            >
              <i className={`fa ${added ? "fa-check" : "fa-plus"}`} />
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="stitch-product-card">
      <div className="stitch-product-card__media">
        {imageSrc ? (
          <img src={imageSrc} alt={product.name} loading="lazy" />
        ) : (
          <div className="stitch-product-card__placeholder">
            <i className="fa fa-cutlery" />
          </div>
        )}
      </div>
      <div className="stitch-product-card__body">
        <div className="stitch-product-card__head">
          <h3>{product.name}</h3>
          <span className="stitch-product-card__price">{priceLabel}</span>
        </div>
        {canOrder && (
          <button
            type="button"
            className={`stitch-btn-add ${added ? "is-added" : ""}`}
            onClick={handleAdd}
          >
            <i className={`fa ${added ? "fa-check" : "fa-shopping-cart"}`} />
            {added ? t("qr.addedToCart") : t("qr.addToCart")}
          </button>
        )}
      </div>
    </article>
  );
}
