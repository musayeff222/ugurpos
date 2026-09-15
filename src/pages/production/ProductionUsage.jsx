import { useEffect, useState } from "react";
import { api } from "../../api/client";
import Modal from "../../components/ui/Modal";
import { compatibleUnits, convertQty, defaultInputUnit, formatStock, roundQty } from "./units";

export default function ProductionUsage() {
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [step, setStep] = useState("idle");
  const [productId, setProductId] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [qtyMap, setQtyMap] = useState({});
  const [unitMap, setUnitMap] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = products.find((p) => p.id === productId);

  const load = async () => {
    const [raw, list] = await Promise.all([api.getProductionRawMaterials(), api.getProductionProducts()]);
    setMaterials(raw);
    setProducts(list);
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const startUsage = () => {
    setError("");
    setProductId("");
    setNewProductName("");
    setQtyMap({});
    setUnitMap({});
    setStep("pick");
  };

  const createProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await api.createProductionProduct({ name: newProductName.trim() });
      await load();
      setProductId(created.id);
      setNewProductName("");
      setStep("fill");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmUsage = async () => {
    setSaving(true);
    setError("");
    try {
      await api.createProductionBatch({
        productId,
        items: materials
          .map((row) => ({
            rawMaterialId: row.id,
            qty: roundQty(convertQty(qtyMap[row.id] || 0, unitMap[row.id] || defaultInputUnit(row.unit), row.unit)),
          }))
          .filter((item) => item.qty > 0),
      });
      setStep("idle");
      setProductId("");
      setQtyMap({});
      setUnitMap({});
      setMessage("İstifadə qeydə alındı. Xammal stoku azaldıldı.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="prod-page">
      <div className="prod-hero">
        <div>
          <p className="prod-kicker">İstehsal</p>
          <h1>İstifadə</h1>
          <span>Nə hazırlanır və hansı xammal sərf olunur</span>
        </div>
        <button type="button" className="prod-btn prod-btn--primary" onClick={startUsage}>
          + İstifadə
        </button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}

      {step === "idle" && (
        <section className="prod-panel prod-idle">
          <p>İstifadəni başlatmaq üçün yuxarıdakı düyməyə basın. Əvvəl hazırlanan məhsul seçilir, sonra xammal miqdarları yazılır.</p>
        </section>
      )}

      {step === "fill" && selected && (
        <section className="prod-usage-board">
          <header>
            <h2>{selected.name}</h2>
            <span>Hər xammal üçün miqdarı yazın. 100 qram üçün sadəcə 100 yazıb qram seçin.</span>
          </header>
          <div className="prod-usage-list">
            {materials.map((row) => {
              const inputUnit = unitMap[row.id] || defaultInputUnit(row.unit);
              const converted = roundQty(convertQty(qtyMap[row.id] || 0, inputUnit, row.unit));
              return (
                <div key={row.id} className="prod-usage-row">
                  <strong>{row.name}</strong>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="məs: 100"
                    value={qtyMap[row.id] || ""}
                    onChange={(e) => setQtyMap({ ...qtyMap, [row.id]: e.target.value })}
                  />
                  <select
                    value={inputUnit}
                    onChange={(e) => setUnitMap({ ...unitMap, [row.id]: e.target.value })}
                  >
                    {compatibleUnits(row.unit).map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                  <small>
                    stok: {formatStock(row.stock, row.unit)}
                    {Number(qtyMap[row.id]) > 0 ? ` · çıxılacaq: ${converted} ${row.unit}` : ""}
                  </small>
                </div>
              );
            })}
            {!materials.length && <p className="prod-empty">Əvvəl xammaddə əlavə edin.</p>}
          </div>
          <div className="form-actions">
            <button type="button" className="prod-btn" onClick={() => setStep("pick")}>
              Geri
            </button>
            <button type="button" className="prod-btn prod-btn--primary" onClick={confirmUsage} disabled={saving || !materials.length}>
              {saving ? "Yadda saxlanır..." : "Təsdiqlə"}
            </button>
          </div>
        </section>
      )}

      <Modal open={step === "pick"} title="Nə hazırlanacaq?" onClose={() => setStep("idle")}>
        {products.length ? (
          <label className="erp-field">
            <span>Hazırlanan məhsul</span>
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                if (e.target.value) setStep("fill");
              }}
            >
              <option value="">Seçin</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="hint-text">Hələ hazırlanan məhsul yoxdur.</p>
        )}
        <form className="erp-form" onSubmit={createProduct}>
          <label className="erp-field">
            <span>+ Yeni hazırlanan məhsul yarat</span>
            <input
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              placeholder="Məsələn: Çiy köftə"
              required
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="prod-btn prod-btn--primary" disabled={saving}>
              Yarat və davam et
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
