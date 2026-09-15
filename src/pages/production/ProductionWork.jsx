import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { formatDateTime } from "../../utils/format";

const emptyLine = () => ({ rawMaterialId: "", qty: "" });

export default function ProductionWork() {
  const [materials, setMaterials] = useState([]);
  const [batches, setBatches] = useState([]);
  const [productName, setProductName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("əd");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState([emptyLine()]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [raw, list] = await Promise.all([api.getProductionRawMaterials(), api.getProductionBatches()]);
    setMaterials(raw);
    setBatches(list);
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      await api.createProductionBatch({
        productName: productName.trim(),
        qty: Number(qty),
        unit,
        note: note.trim(),
        items: lines
          .filter((line) => line.rawMaterialId && Number(line.qty) > 0)
          .map((line) => ({ rawMaterialId: line.rawMaterialId, qty: Number(line.qty) })),
      });
      setProductName("");
      setQty("");
      setNote("");
      setLines([emptyLine()]);
      await load();
      setMessage("İstehsalat qeydə alındı. Xam maddə stoku azaldıldı.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="crm-listbar">
        <div>
          <h2>İstehsalat</h2>
          <span>Hazır məhsul və sərf olunan xammal</span>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}

      <form className="erp-panel erp-form" onSubmit={save}>
        <header className="erp-panel__head">
          <h3>Yeni istehsal</h3>
        </header>
        <div className="erp-form-grid">
          <label className="erp-field">
            <span>Hazır məhsul *</span>
            <input value={productName} onChange={(e) => setProductName(e.target.value)} required />
          </label>
          <label className="erp-field">
            <span>Miqdar *</span>
            <input type="number" step="0.01" min="0.01" value={qty} onChange={(e) => setQty(e.target.value)} required />
          </label>
          <label className="erp-field">
            <span>Vahid</span>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} />
          </label>
          <label className="erp-field erp-field--full">
            <span>Qeyd</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        <p className="hint-text">Sərf olunan xam maddələr</p>
        <div className="production-lines">
          {lines.map((line, index) => (
            <div className="production-line" key={index}>
              <select
                value={line.rawMaterialId}
                onChange={(e) => {
                  const next = [...lines];
                  next[index] = { ...next[index], rawMaterialId: e.target.value };
                  setLines(next);
                }}
                required
              >
                <option value="">Xam maddə seçin</option>
                {materials.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.stock} {item.unit})
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Miqdar"
                value={line.qty}
                onChange={(e) => {
                  const next = [...lines];
                  next[index] = { ...next[index], qty: e.target.value };
                  setLines(next);
                }}
                required
              />
              <button
                type="button"
                className="btn btn-default btn-sm"
                onClick={() => {
                  const next = lines.filter((_, i) => i !== index);
                  setLines(next.length ? next : [emptyLine()]);
                }}
                aria-label="Sil"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-default btn-sm" onClick={() => setLines([...lines, emptyLine()])}>
          Xam maddə əlavə et
        </button>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving || !materials.length}>
            {saving ? "Yadda saxlanır..." : "İstehsalı qeyd et"}
          </button>
        </div>
        {!materials.length && <p className="hint-text">Əvvəl Xam maddələr səhifəsindən xammal əlavə edin.</p>}
      </form>

      <section className="erp-panel erp-panel--flush">
        <header className="erp-panel__head">
          <h3>Son istehsallar</h3>
        </header>
        <div className="admin-table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Tarix</th>
                <th>Məhsul</th>
                <th>Miqdar</th>
                <th>Xammal</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id}>
                  <td>{batch.createdAt ? formatDateTime(batch.createdAt) : "—"}</td>
                  <td>
                    <strong>{batch.productName}</strong>
                    {batch.note ? <small>{batch.note}</small> : null}
                  </td>
                  <td>
                    {batch.qty} {batch.unit}
                  </td>
                  <td>
                    {(batch.items || []).map((item) => `${item.rawMaterialName} ${item.qty}`).join(", ") || "—"}
                  </td>
                </tr>
              ))}
              {!batches.length && (
                <tr>
                  <td colSpan={4} className="erp-table__empty">
                    Hələ istehsal yoxdur.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
