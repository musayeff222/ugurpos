import BarcodeSvg from "./BarcodeSvg";
import { formatMoney } from "../../utils/format";
import "../../styles/print-80mm.css";

export function ProductLabel({ product, storeName, priceField = "price1", showCode = true }) {
  const price = product[priceField] ?? product.price1;
  return (
    <div className="product-label">
      {storeName && <div className="product-label__store">{storeName}</div>}
      <div className="product-label__name">{product.name}</div>
      <div className="product-label__meta">
        {showCode && product.stockCode ? <span>{product.stockCode}</span> : <span />}
        {product.unit ? <span>{product.unit}</span> : null}
      </div>
      <div className="product-label__price">{formatMoney(price)}</div>
      <BarcodeSvg value={product.barcode} className="product-label__barcode" height={38} width={1.3} />
    </div>
  );
}

export function ScaleLabel({ product, storeName, weightKg, unitPrice, totalPrice, dateLabel }) {
  const weight = Number(weightKg) || 0;
  const unit = Number(unitPrice) || product.price1 || 0;
  const total = Number(totalPrice) || weight * unit;

  return (
    <div className="scale-label">
      {storeName && <div className="scale-label__store">{storeName}</div>}
      <div className="scale-label__name">{product.name}</div>
      <div className="scale-label__weight-row">
        {weight.toLocaleString("tr-TR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg
      </div>
      <div className="scale-label__unit-price">{formatMoney(unit)} / kg</div>
      <div className="scale-label__total">{formatMoney(total)}</div>
      {dateLabel && <div className="scale-label__date">{dateLabel}</div>}
      <BarcodeSvg value={product.barcode} className="scale-label__barcode" height={40} width={1.35} />
    </div>
  );
}
