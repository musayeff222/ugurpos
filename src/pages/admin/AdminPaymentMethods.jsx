import { useEffect, useState } from "react";
import { api } from "../../api/client";

const emptyForm = { name: "", active: true };

export default function AdminPaymentMethods() {
  const [methods, setMethods] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const list = await api.getAdminPaymentMethods();
    setMethods(list);
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setFormOpen(true);
    setError("");
    setMessage("");
  };

  const startEdit = (method) => {
    setEditId(method.id);
    setForm({ name: method.name, active: method.active !== false });
    setFormOpen(true);
    setError("");
    setMessage("");
  };

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!form.name.trim()) {
      setError("Ödeme yöntemi adı zorunludur.");
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await api.updateAdminPaymentMethod(editId, {
          name: form.name.trim(),
          active: form.active,
        });
        setMessage("Ödeme yöntemi güncellendi. Tüm şubelerin POS Diğer listesinde görünür.");
      } else {
        await api.createAdminPaymentMethod({ name: form.name.trim() });
        setMessage("Ödeme yöntemi oluşturuldu. Tüm şubelerin POS Diğer listesinde görünür.");
      }
      await load();
      setFormOpen(false);
      setEditId(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (method) => {
    setError("");
    try {
      await api.updateAdminPaymentMethod(method.id, { name: method.name, active: !method.active });
      await load();
      setMessage(method.active ? "Ödeme yöntemi pasifleştirildi." : "Ödeme yöntemi aktifleştirildi.");
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (method) => {
    if (!window.confirm(`"${method.name}" yöntemini silmek istiyor musunuz? Eski satış kayıtları korunur.`)) return;
    setError("");
    try {
      await api.deleteAdminPaymentMethod(method.id);
      await load();
      setMessage("Ödeme yöntemi silindi.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page erp-page">
      <div className="crm-listbar">
        <div>
          <h2>Ödeme Yöntemleri</h2>
          <span>Firma genelinde · tüm şube POS Diğer listesinde</span>
        </div>
        <div className="crm-listbar__tools">
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Yeni ödeme yöntemi oluştur
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}

      {formOpen && (
        <section className="erp-panel">
          <header className="erp-panel__head">
            <h3>{editId ? "Ödeme yöntemini düzenle" : "Yeni ödeme yöntemi"}</h3>
          </header>
          <form className="erp-form" onSubmit={save}>
            <div className="erp-form-grid">
              <label className="erp-field erp-field--full">
                <span>Ad *</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Örn: Bolt, Wolt, Yandex"
                  required
                />
              </label>
              {editId && (
                <label className="erp-field">
                  <span>Durum</span>
                  <select
                    value={form.active ? "1" : "0"}
                    onChange={(e) => setForm({ ...form, active: e.target.value === "1" })}
                  >
                    <option value="1">Aktif</option>
                    <option value="0">Pasif</option>
                  </select>
                </label>
              )}
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-default"
                onClick={() => {
                  setFormOpen(false);
                  setEditId(null);
                  setForm(emptyForm);
                }}
              >
                Vazgeç
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Kaydediliyor..." : editId ? "Güncelle" : "Oluştur"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="erp-panel erp-panel--flush">
        <div className="admin-table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Yöntem</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {methods.map((method) => (
                <tr key={method.id}>
                  <td>
                    <strong>{method.name}</strong>
                  </td>
                  <td>{method.active ? "Aktif" : "Pasif"}</td>
                  <td>
                    <div className="staff-row-actions">
                      <button type="button" className="btn btn-default btn-sm" onClick={() => startEdit(method)}>
                        Düzenle
                      </button>
                      <button type="button" className="btn btn-default btn-sm" onClick={() => toggleActive(method)}>
                        {method.active ? "Pasifleştir" : "Aktifleştir"}
                      </button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(method)}>
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!methods.length && (
                <tr>
                  <td colSpan={3} className="erp-table__empty">
                    Henüz ödeme yöntemi yok. Yeni ödeme yöntemi oluşturun.
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
