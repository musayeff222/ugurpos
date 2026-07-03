import { formatMoney, formatDateTime } from "../../utils/format";
import "../../styles/print-receipt.css";

const PAYMENT_LABELS = {
  cash: "NAKİT",
  pos: "POS / Kredi Kartı",
  open: "AÇIK HESAP",
  partial: "PARÇALI ÖDEME",
  refund: "İADE",
};

export function buildReceiptText(data) {
  const lines = [
    data.storeName || "Mağaza",
    data.copyLabel ? `--- ${data.copyLabel} ---` : null,
    `Fiş No: ${data.code || "-"}`,
    formatDateTime(data.createdAt),
    data.customerName ? `Müşteri: ${data.customerName}` : null,
    "",
    ...(data.items || []).map(
      (item) =>
        `${item.name}\n  ${item.qty} x ${Number(item.price).toFixed(2)} = ${(item.qty * item.price).toFixed(2)}`
    ),
    "",
    `TOPLAM: ${Number(data.total).toFixed(2)} AZN`,
    `Ödeme: ${PAYMENT_LABELS[data.paymentType] || data.paymentType || "-"}`,
    data.paymentType === "partial" && data.cashAmount != null
      ? `Nakit: ${Number(data.cashAmount).toFixed(2)} AZN`
      : null,
    data.paymentType === "partial" && data.posAmount != null
      ? `Kart: ${Number(data.posAmount).toFixed(2)} AZN`
      : null,
    data.paidAmount != null ? `Ödenen: ${Number(data.paidAmount).toFixed(2)} AZN` : null,
    data.change > 0 ? `Para Üstü: ${Number(data.change).toFixed(2)} AZN` : null,
    data.note ? `Not: ${data.note}` : null,
    "",
    "Teşekkür ederiz.",
  ].filter(Boolean);

  return lines.join("\n");
}

export default function SaleReceipt({ data, paper = "thermal", copyLabel = "" }) {
  const subtotal = (data.items || []).reduce(
    (sum, item) => sum + item.qty * item.price - (item.discount || 0),
    0
  );
  const paymentLabel = PAYMENT_LABELS[data.paymentType] || data.paymentType || "-";

  return (
    <div className={`sale-receipt sale-receipt--${paper}`}>
      {copyLabel && <div className="sale-receipt__copy">{copyLabel}</div>}
      <div className="sale-receipt__store">{data.storeName || "Mağaza"}</div>
      <div className="sale-receipt__meta">
        <span>Fiş: {data.code || "ÖNİZLEME"}</span>
        <span>{formatDateTime(data.createdAt)}</span>
      </div>
      {data.customerName && (
        <div className="sale-receipt__customer">Müşteri: {data.customerName}</div>
      )}
      <div className="sale-receipt__divider" />
      <table className="sale-receipt__items">
        <thead>
          <tr>
            <th>Ürün</th>
            <th>Mik</th>
            <th>Fiyat</th>
            <th>Tutar</th>
          </tr>
        </thead>
        <tbody>
          {(data.items || []).map((item, idx) => (
            <tr key={item.id || idx}>
              <td>{item.name}</td>
              <td>{item.qty}</td>
              <td>{Number(item.price).toFixed(2)}</td>
              <td>{(item.qty * item.price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="sale-receipt__divider" />
      <div className="sale-receipt__totals">
        <div className="sale-receipt__row">
          <span>Ara Toplam</span>
          <span>{subtotal.toFixed(2)} AZN</span>
        </div>
        {Number(data.discount) > 0 && (
          <div className="sale-receipt__row">
            <span>İskonto ({data.discountType === "Yüzde" ? `%${data.discount}` : "AZN"})</span>
            <span>-{Number(data.discount).toFixed(2)}</span>
          </div>
        )}
        <div className="sale-receipt__row sale-receipt__row--total">
          <span>TOPLAM</span>
          <span>{formatMoney(data.total, "az")}</span>
        </div>
        <div className="sale-receipt__row">
          <span>Ödeme</span>
          <span>{paymentLabel}</span>
        </div>
        {data.paymentType === "partial" && (
          <>
            <div className="sale-receipt__row">
              <span>Nakit</span>
              <span>{Number(data.cashAmount || 0).toFixed(2)} AZN</span>
            </div>
            <div className="sale-receipt__row">
              <span>Kart</span>
              <span>{Number(data.posAmount || 0).toFixed(2)} AZN</span>
            </div>
          </>
        )}
        {data.paidAmount != null && (
          <div className="sale-receipt__row">
            <span>Ödenen</span>
            <span>{Number(data.paidAmount).toFixed(2)} AZN</span>
          </div>
        )}
        {Number(data.change) > 0 && (
          <div className="sale-receipt__row">
            <span>Para Üstü</span>
            <span>{Number(data.change).toFixed(2)} AZN</span>
          </div>
        )}
      </div>
      {data.note && <div className="sale-receipt__note">Not: {data.note}</div>}
      {data.staffName && <div className="sale-receipt__staff">Personel: {data.staffName}</div>}
      <div className="sale-receipt__thanks">Teşekkür ederiz.</div>
    </div>
  );
}
