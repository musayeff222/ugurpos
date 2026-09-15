import { useEffect, useState } from "react";
import { api } from "../../api/client";
import Modal from "../../components/ui/Modal";
import { formatDateTime } from "../../utils/format";
import ProductionOverviewCards from "./ProductionOverviewCards";
import { RAW_UNITS, compatibleUnits, convertQty, defaultInputUnit, formatStock, roundQty } from "./units";

const emptyCreate = { name: "", unit: "kq", note: "" };

export default function ProductionRawMaterials() {
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", unit: "kq" });
  const [stockRow, setStockRow] = useState(null);
  const [stockQty, setStockQty] = useState("");
  const [stockUnit, setStockUnit] = useState("qram");
  const [history, setHistory] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [list, dash] = await Promise.all([api.getProductionRawMaterials(), api.getProductionSummary()]);
    setRows(list);
    setSummary(dash);
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.createProductionRawMaterial(createForm);
      setCreateForm(emptyCreate);
      setCreateOpen(false);
      setMessage("Xammaddə yaradıldı. Stok + düyməsi ilə əlavə olunur.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editRow) return;
    setSaving(true);
    try {
      await api.updateProductionRawMaterial(editRow.id, editForm);
      setEditRow(null);
      setMessage("Xammaddə yeniləndi.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addStock = async (e) => {
    e.preventDefault();
    if (!stockRow) return;
    setSaving(true);
    try {
      await api.addProductionRawStock(stockRow.id, {
        qty: roundQty(convertQty(stockQty, stockUnit, stockRow.unit)),
      });
      setStockRow(null);
      setStockQty("");
      setMessage("Stok əlavə olundu.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (row) => {
    setError("");
    try {
      setHistory(await api.getProductionRawMovements(row.id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="prod-page">
      <div className="prod-hero">
        <div>
          <p className="prod-kicker">Anbar</p>
          <h1>Xammaddələr</h1>
          <span>Stok avtomatik hesablanır, istifadədə azalır</span>
        </div>
        <button type="button" className="prod-btn prod-btn--primary" onClick={() => setCreateOpen(true)}>
          + Yeni xammaddə əlavə et
        </button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}
      {summary && <ProductionOverviewCards summary={summary} />}

      <section className="prod-panel">
        <div className="admin-table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Stok</th>
                <th>Ölçü vahidi</th>
                <th>Əməliyyatlar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                    {row.note ? <small>{row.note}</small> : null}
                    {row.critical ? <small className="prod-tag prod-tag--crit">Kritik</small> : null}
                    {row.lowStock ? <small className="prod-tag">Aşağı stok</small> : null}
                  </td>
                    <td>{formatStock(row.stock, row.unit)}</td>
                  <td>{row.unit}</td>
                  <td className="prod-actions">
                    <button type="button" className="prod-icon" title="Düzəlt" onClick={() => { setEditRow(row); setEditForm({ name: row.name, unit: row.unit }); }}>
                      <i className="fa fa-pencil" aria-hidden />
                    </button>
                    <button type="button" className="prod-icon" title="Stok tarixçəsi" onClick={() => openHistory(row)}>
                      <i className="fa fa-eye" aria-hidden />
                    </button>
                    <button type="button" className="prod-icon prod-icon--add" title="Stok əlavə et" onClick={() => { setStockRow(row); setStockQty(""); setStockUnit(defaultInputUnit(row.unit)); }}>
                      <i className="fa fa-plus" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={4} className="erp-table__empty">
                    Xammaddə yoxdur. Yuxarıdakı düymədən əlavə edin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={createOpen} title="Yeni xammaddə" onClose={() => setCreateOpen(false)}>
        <form className="erp-form" onSubmit={create}>
          <label className="erp-field">
            <span>Xammalın adı *</span>
            <input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required />
          </label>
          <label className="erp-field">
            <span>Ölçü vahidi *</span>
            <select value={createForm.unit} onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}>
              {RAW_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>
          <label className="erp-field">
            <span>Qeyd</span>
            <input value={createForm.note} onChange={(e) => setCreateForm({ ...createForm, note: e.target.value })} />
          </label>
          <div className="form-actions">
            <button type="submit" className="prod-btn prod-btn--primary" disabled={saving}>
              {saving ? "Yadda saxlanır..." : "Yarat"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editRow} title="Düzəlt" onClose={() => setEditRow(null)}>
        <form className="erp-form" onSubmit={saveEdit}>
          <p className="hint-text">Yalnız ad və ölçü vahidi dəyişir. Stok miqdarı plus düyməsi ilə artırılır.</p>
          <label className="erp-field">
            <span>Ad *</span>
            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
          </label>
          <label className="erp-field">
            <span>Ölçü vahidi *</span>
            <select value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}>
              {RAW_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button type="submit" className="prod-btn prod-btn--primary" disabled={saving}>
              Yadda saxla
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!stockRow} title={stockRow ? `${stockRow.name} — stok əlavə et` : "Stok"} onClose={() => setStockRow(null)}>
        <form className="erp-form" onSubmit={addStock}>
          <p className="hint-text">100 qram yazın. 0.1 kq yazmağa ehtiyac yoxdur — vahidi qram seçin.</p>
          <label className="erp-field">
            <span>Miqdar</span>
            <input type="number" step="any" min="0.001" value={stockQty} onChange={(e) => setStockQty(e.target.value)} required />
          </label>
          <label className="erp-field">
            <span>Ölçü vahidi</span>
            <select value={stockUnit} onChange={(e) => setStockUnit(e.target.value)}>
              {compatibleUnits(stockRow.unit).map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>
          {stockQty && (
            <p className="hint-text">
              Stoka əlavə olunacaq: {roundQty(convertQty(stockQty, stockUnit, stockRow.unit))} {stockRow.unit}
            </p>
          )}
          <div className="form-actions">
            <button type="submit" className="prod-btn prod-btn--primary" disabled={saving}>
              Əlavə et
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!history}
        title={history ? `${history.material.name} — stok tarixçəsi` : "Tarixçə"}
        onClose={() => setHistory(null)}
      >
        {history && (
          <table className="erp-table">
            <thead>
              <tr>
                <th>Tarix</th>
                <th>Növ</th>
                <th>Miqdar</th>
                <th>Sonra</th>
                <th>Qeyd</th>
              </tr>
            </thead>
            <tbody>
              {history.movements.map((row) => (
                <tr key={row.id}>
                  <td>{row.createdAt ? formatDateTime(row.createdAt, "az") : "—"}</td>
                  <td>{row.type === "in" ? "Giriş" : "İstifadə"}</td>
                  <td>
                    {row.type === "in" ? "+" : "−"}
                    {row.qty} {history.material.unit}
                  </td>
                  <td>{row.stockAfter}</td>
                  <td>{row.productName || row.note || row.createdBy || "—"}</td>
                </tr>
              ))}
              {!history.movements.length && (
                <tr>
                  <td colSpan={5} className="erp-table__empty">
                    Tarixçə boşdur.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}
