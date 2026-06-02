import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../store/StoreContext";
import { ScaleLabel } from "../components/print/ThermalLabels";
import PageHeader from "../components/ui/PageHeader";
import { formatMoney } from "../utils/format";
import "../styles/print-80mm.css";

export default function ScalePrintPage() {
  const { state } = useStore();
  const { user } = useAuth();
  const weightProducts = useMemo(
    () => state.products.filter((p) => p.active && ["KG", "Gram", "Litre"].includes(p.unit)),
    [state.products]
  );
  const allProducts = useMemo(() => state.products.filter((p) => p.active), [state.products]);
  const list = weightProducts.length ? weightProducts : allProducts;

  const [productId, setProductId] = useState(list[0]?.id || "");
  const [weight, setWeight] = useState("1.000");
  const [unitPrice, setUnitPrice] = useState("");
  const [copies, setCopies] = useState(1);

  const product = state.products.find((p) => p.id === productId) || list[0];
  const weightNum = Number(String(weight).replace(",", ".")) || 0;
  const unit = Number(unitPrice) || product?.price1 || 0;
  const total = weightNum * unit;
  const dateLabel = new Date().toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const labels = product
    ? Array.from({ length: Math.max(1, copies) }, () => product)
    : [];

  return (
    <div>
      <PageHeader title="Barkodlu Terazi Çıktısı" subtitle="80mm termal yazıcı — terazi etiketi şablonu" />

      <div className="card">
        <div className="card-body">
          <div className="print-controls">
            <label>
              Ürün
              <select value={productId || product?.id} onChange={(e) => setProductId(e.target.value)}>
                {list.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.unit || "Adet"})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ağırlık (kg)
              <input
                type="text"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="1.250"
              />
            </label>
            <label>
              Birim fiyat (₺/kg)
              <input
                type="number"
                step="0.01"
                value={unitPrice}
                placeholder={String(product?.price1 ?? "")}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </label>
            <label>
              Kopya
              <input type="number" min="1" max="20" value={copies} onChange={(e) => setCopies(Number(e.target.value) || 1)} />
            </label>
            <button type="button" className="btn btn-primary" disabled={!product} onClick={() => window.print()}>
              <i className="fa fa-print" /> Terazi Etiketi Yazdır
            </button>
          </div>

          {product && (
            <p style={{ fontSize: 13, marginBottom: 12 }}>
              Hesaplanan tutar: <strong>{formatMoney(total)}</strong> ({weightNum.toFixed(3)} kg × {formatMoney(unit)}/kg)
            </p>
          )}

          <div className="print-area">
            <div className="print-preview-grid">
              {!product ? (
                <p>Ürün bulunamadı.</p>
              ) : (
                labels.map((p, idx) => (
                  <ScaleLabel
                    key={idx}
                    product={p}
                    storeName={user?.firmName}
                    weightKg={weightNum}
                    unitPrice={unit}
                    totalPrice={total}
                    dateLabel={dateLabel}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
