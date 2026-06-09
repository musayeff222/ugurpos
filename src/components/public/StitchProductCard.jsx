import { useState } from "react";
import StitchIcon from "./StitchIcon";
import { useLocale } from "../../context/LocaleContext";

export default function StitchProductCard({
  product,
  imageSrc,
  priceLabel,
  description,
  canOrder,
  onAdd,
  layout = "grid",
  badge,
}) {
  const { t } = useLocale();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    if (!canOrder) return;
    onAdd?.();
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  if (layout === "row") {
    return (
      <article className="sf-product-row">
        <div className="sf-product-row__media">
          {imageSrc ? (
            <img src={imageSrc} alt={product.name} loading="lazy" />
          ) : (
            <div className="sf-product-row__placeholder">
              <StitchIcon name="restaurant" />
            </div>
          )}
        </div>
        <div className="sf-product-row__body">
          <div className="sf-product-row__info">
            <h4>{product.name}</h4>
            {description && <p>{description}</p>}
            <span className="sf-product-row__price">{priceLabel}</span>
          </div>
          {canOrder && (
            <button
              type="button"
              className={`sf-product-row__add ${added ? "is-added" : ""}`}
              onClick={handleAdd}
              aria-label={t("qr.addToCart")}
            >
              <StitchIcon name={added ? "check" : "add"} />
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="sf-product-card">
      <div className="sf-product-card__media">
        {imageSrc ? (
          <img src={imageSrc} alt={product.name} loading="lazy" />
        ) : (
          <div className="sf-product-card__placeholder">
            <StitchIcon name="restaurant" />
          </div>
        )}
        {badge && <span className={`sf-product-card__badge ${badge.tone || ""}`}>{badge.text}</span>}
      </div>
      <div className="sf-product-card__body">
        <div className="sf-product-card__head">
          <h3>{product.name}</h3>
          <span className="sf-product-card__price">{priceLabel}</span>
        </div>
        {description && <p className="sf-product-card__desc">{description}</p>}
        {canOrder && (
          <button type="button" className={`sf-btn-add ${added ? "is-added" : ""}`} onClick={handleAdd}>
            <StitchIcon name={added ? "check_circle" : "add_shopping_cart"} />
            {added ? t("qr.addedToCart") : t("qr.addToCart")}
          </button>
        )}
      </div>
    </article>
  );
}
