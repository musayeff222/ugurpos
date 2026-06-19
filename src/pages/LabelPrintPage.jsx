import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../store/StoreContext";
import { ProductLabel } from "../components/print/ThermalLabels";
import PageHeader from "../components/ui/PageHeader";
import "../styles/print-80mm.css";

export default function LabelPrintPage({ designer = false }) {
  const { state } = useStore();
  const { user } = useAuth();
  const [selected, setSelected] = useState([]);
  const [copies, setCopies] = useState(1);
  const [priceField, setPriceField] = useState("price1");
  const [showStore, setShowStore] = useState(true);
  const [search, setSearch] = useState("");

  const products = useMemo(() => {
    if (!search.trim()) return state.products.filter((p) => p.active);
    const q = search.toLocaleLowerCase("tr");
    return state.products.filter(
      (p) =>
        p.active &&
        (p.name.toLocaleLowerCase("tr").includes(q) ||
          p.barcode.includes(q) ||
          p.stockCode.toLocaleLowerCase("tr").includes(q))
    );
  }, [state.products, search]);

  const labels = useMemo(() => {
    const list = selected.length
      ? state.products.filter((p) => selected.includes(p.id))
      : [];
    const out = [];
    list.forEach((p) => {
      for (let i = 0; i < copies; i++) out.push(p);
    });
    return out;
  }, [selected, copies, state.products]);

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAll = () => setSelected(products.map((p) => p.id));
  const clearAll = () => setSelected([]);

  return (
    <div>
      <PageHeader
        title={designer ? "Etiket Tasarla & Üret" : "Etiket Üret"}
        subtitle="80mm termal yazıcı — raf etiketi şablonu"
      />

      <div className="card">
        <div className="card-body">
          <div className="print-controls">
            <label>
              Ara
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün adı, barkod..." />
            </label>
            <label>
              Fiyat
              <select value={priceField} onChange={(e) => setPriceField(e.target.value)}>
                <option value="price1">Fiyat 1</option>
                <option value="price2">Fiyat 2</option>
              </select>
            </label>
            <label>
              Kopya / ürün
              <input type="number" min="1" max="99" value={copies} onChange={(e) => setCopies(Number(e.target.value) || 1)} />
            </label>
            {designer && (
              <label className="checkbox-row" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={showStore} onChange={(e) => setShowStore(e.target.checked)} />
                Firma adı göster
              </label>
            )}
            <button type="button" className="btn btn-default btn-sm" onClick={selectAll}>
              Tümünü seç
            </button>
            <button type="button" className="btn btn-default btn-sm" onClick={clearAll}>
              Temizle
            </button>
            <button type="button" className="btn btn-primary" disabled={!labels.length} onClick={() => window.print()}>
              <i className="fa fa-print" /> Yazdır ({labels.length})
            </button>
          </div>

          <div className="table-wrap" style={{ maxHeight: 220, marginBottom: 16, border: "1px solid #ebebeb", borderRadius: 6 }}>
            <table style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 40 }} />
                  <th>Ürün</th>
                  <th>Barkod</th>
                  <th>Fiyat</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
                    </td>
                    <td>{p.name}</td>
                    <td>{p.barcode}</td>
                    <td>{p[priceField] ?? p.price1} ₺</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
            Önizleme (80mm genişlik). Yazıcıda kenar boşluğu için 80mm termal rulo seçin.
          </p>
          <div className="print-area">
            <div className="print-preview-grid">
              {labels.length === 0 ? (
                <p>Yazdırmak için ürün seçin.</p>
              ) : (
                labels.map((p, idx) => (
                  <ProductLabel
                    key={`${p.id}-${idx}`}
                    product={p}
                    storeName={showStore ? user?.firmName : ""}
                    priceField={priceField}
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
