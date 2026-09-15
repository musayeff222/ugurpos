import { useEffect, useState } from "react";
import { api } from "../../api/client";

const emptyForm = { name: "", unit: "kq", stock: "", note: "" };

export default function ProductionRawMaterials() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setRows(await api.getProductionRawMaterials());
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!form.name.trim()) {
      setError("Ad yazın.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        unit: form.unit.trim() || "kq",
        stock: Number(form.stock) || 0,
        note: form.note.trim(),
      };
      if (editId) await api.updateProductionRawMaterial(editId, payload);
      else await api.createProductionRawMaterial(payload);
      await load();
      setEditId(null);
      setForm(emptyForm);
      setMessage(editId ? "Xam maddə yeniləndi." : "Xam maddə əlavə olundu.");
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
          <h2>Xam maddələr</h2>
          <span>Stok və vahid</span>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}
      <div className="erp-split">
        <section className="erp-panel erp-panel--flush">
          <div className="admin-table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>Vahid</th>
                  <th>Stok</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      {row.note ? <small>{row.note}</small> : null}
                    </td>
                    <td>{row.unit}</td>
                    <td>{row.stock}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-default btn-sm"
                        onClick={() => {
                          setEditId(row.id);
                          setForm({
                            name: row.name,
                            unit: row.unit,
                            stock: String(row.stock ?? ""),
                            note: row.note || "",
                          });
                        }}
                      >
                        Aç
                      </button>{" "}
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={async () => {
                          if (!window.confirm("Bu xam maddə silinsin?")) return;
                          try {
                            await api.deleteProductionRawMaterial(row.id);
                            await load();
                          } catch (err) {
                            setError(err.message);
                          }
                        }}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={4} className="erp-table__empty">
                      Xam maddə yoxdur. Sağdakı formdan əlavə edin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <form className="erp-panel erp-form" onSubmit={save}>
          <header className="erp-panel__head">
            <h3>{editId ? "Xam maddəni redaktə et" : "Yeni xam maddə"}</h3>
          </header>
          <label className="erp-field">
            <span>Ad *</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="erp-field">
            <span>Vahid</span>
            <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kq / əd / l" />
          </label>
          <label className="erp-field">
            <span>Stok</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
          </label>
          <label className="erp-field">
            <span>Qeyd</span>
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
          <div className="form-actions">
            {editId && (
              <button
                type="button"
                className="btn btn-default"
                onClick={() => {
                  setEditId(null);
                  setForm(emptyForm);
                }}
              >
                Yeni
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Yadda saxlanır..." : editId ? "Yenilə" : "Əlavə et"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
