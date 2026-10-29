import { formatDateTime, formatMoney } from "../../utils/format";
import { downloadElemanPurchasePdf, shareElemanPurchaseWhatsApp } from "../../utils/elemanPurchaseShare";

export default function ElemanInvoiceScreen({ purchase, personName, storeName, onClose, title = "Alış fakturası" }) {
  if (!purchase) return null;

  const extras = { personName, storeName };
  const share = async (kind) => {
    try {
      if (kind === "pdf") await downloadElemanPurchasePdf(purchase, extras);
      else await shareElemanPurchaseWhatsApp(purchase, extras);
    } catch (err) {
      window.alert(err.message || "Paylaşılmadı");
    }
  };

  return (
    <div className="el-full">
      <header className="el-full__bar">
        <button type="button" className="el-full__back" onClick={onClose}>
          Geri
        </button>
        <h2>{title}</h2>
      </header>
      <article className="el-invoice">
        <p className="el-login__kicker">İstanbul Çiğköfte</p>
        <h3>Alış fakturası</h3>
        <p>
          {personName}
          {storeName ? ` · ${storeName}` : ""}
        </p>
        <p>
          {formatDateTime(purchase.createdAt, "az")} · No {String(purchase.id || "").slice(-8)}
        </p>
        <ul>
          {(purchase.lines || []).map((line, index) => (
            <li key={`${line.productId || line.name}-${index}`}>
              <span>
                {line.qty} {line.unit} {line.name}
              </span>
              <b>
                {formatMoney(line.price)} · {formatMoney(Number(line.qty || 0) * Number(line.price || 0))}
              </b>
            </li>
          ))}
        </ul>
        <footer>
          <span>Ümumi</span>
          <strong>{formatMoney(purchase.total)}</strong>
        </footer>
        {purchase.invoiceUrl ? (
          <img className="el-invoice__photo" src={purchase.invoiceUrl} alt="Faktura şəkli" />
        ) : null}
      </article>
      <div className="el-full__actions">
        <button type="button" className="el-login__submit" onClick={() => share("pdf")}>
          PDF yüklə
        </button>
        <button type="button" className="el-login__submit el-login__submit--wa" onClick={() => share("wa")}>
          WhatsApp
        </button>
      </div>
    </div>
  );
}
