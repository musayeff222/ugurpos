import { useState } from "react";
import { useStore } from "../store/StoreContext";
import PageHeader from "../components/ui/PageHeader";
import { formatMoney } from "../utils/format";
import { runAsync } from "../utils/runAsync";

export default function Refund() {
  const { state, processRefund } = useStore();
  const [barcode, setBarcode] = useState("");
  const [qty, setQty] = useState(1);
  const [items, setItems] = useState([]);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  const addItem = () => {
    const product = state.products.find((p) => p.barcode === barcode.trim() || p.stockCode === barcode.trim());
    if (!product) {
      setMessage("Ürün bulunamadı.");
      return;
    }
    setItems((prev) => [...prev, { productId: product.id, name: product.name, qty: Number(qty), price: product.price1 }]);
    setBarcode("");
    setQty(1);
    setMessage("");
  };

  const submit = async () => {
    if (!items.length) return;
    const ok = await runAsync(() => processRefund({ items, note }), setMessage);
    if (ok) {
      setItems([]);
      setNote("");
      setMessage("İade kaydedildi, stok güncellendi.");
    }
  };

  return (
    <div>
      <PageHeader title="Ürün İadesi Al" />
      {message && <div className="alert alert-info">{message}</div>}
      <div className="card form-inline-bar">
        <input placeholder="Barkod" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
        <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
        <button type="button" className="btn btn-primary" onClick={addItem}>
          Ekle
        </button>
      </div>
      <div className="card">
        <div className="card-body">
          <table>
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Adet</th>
                <th>Fiyat</th>
                <th>Tutar</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.name}</td>
                  <td>{item.qty}</td>
                  <td>{formatMoney(item.price)}</td>
                  <td>{formatMoney(item.qty * item.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <input placeholder="İade notu" value={note} onChange={(e) => setNote(e.target.value)} style={{ marginTop: 12, width: "100%" }} />
          <button type="button" className="btn btn-warning" style={{ marginTop: 12 }} onClick={submit}>
            İadeyi Tamamla
          </button>
        </div>
      </div>
    </div>
  );
}
