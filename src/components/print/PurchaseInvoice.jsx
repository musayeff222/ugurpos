import { formatDateTime, formatMoney } from "../../utils/format";

function when(value) {
  if (!value) return "—";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return String(value);
  return formatDateTime(date);
}

function paymentLabel(type) {
  if (type === "borc") return "Borç";
  if (type === "nagd") return "Nakit";
  if (type === "kart") return "Kart";
  return type || "—";
}

export default function PurchaseInvoice({ purchase, storeName }) {
  const lines = purchase?.lines || [];
  return (
    <article className="sale-receipt sale-receipt--a4">
      <div className="sale-receipt__copy">ALIŞ FATURASI</div>
      <div className="sale-receipt__store">{storeName || "UgurPOS"}</div>
      <div className="sale-receipt__meta">
        <span>Tarih: {when(purchase?.createdAt)}</span>
        <span>No: {String(purchase?.id || "").slice(-8)}</span>
      </div>
      <div className="sale-receipt__customer">
        Toptancı: {purchase?.wholesalerName || "—"}
        {purchase?.wholesalerPhone ? ` · ${purchase.wholesalerPhone}` : ""}
      </div>
      <div className="sale-receipt__customer">
        Ödeme: {paymentLabel(purchase?.paymentType)}
        {purchase?.kassaName ? ` · ${purchase.kassaName}` : ""}
      </div>
      <div className="sale-receipt__divider" />
      <table className="sale-receipt__items">
        <thead>
          <tr>
            <th>Ürün</th>
            <th>Adet</th>
            <th>Fiyat</th>
            <th>Tutar</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={`${line.productId || line.name}-${index}`}>
              <td>{line.name}</td>
              <td>{line.qty}</td>
              <td>{formatMoney(line.buyPrice)}</td>
              <td>{formatMoney(Number(line.qty || 0) * Number(line.buyPrice || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="sale-receipt__row sale-receipt__row--total">Toplam: {formatMoney(purchase?.total)}</div>
      {purchase?.note ? <div className="sale-receipt__note">{purchase.note}</div> : null}
    </article>
  );
}
