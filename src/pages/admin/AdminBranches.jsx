import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import PageHeader from "../../components/ui/PageHeader";

const emptyForm = { name: "", code: "", address: "", phone: "" };

export default function AdminBranches() {
  const { refreshBranches } = useAuth();
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const rows = await api.getAdminBranches();
    setBranches(rows);
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      if (editId) {
        await api.updateBranch(editId, form);
        setMessage("Şube güncellendi.");
      } else {
        await api.createBranch(form);
        setMessage("Yeni şube oluşturuldu.");
      }
      await load();
      await refreshBranches();
      resetForm();
    } catch (err) {
      setError(err.message || "İşlem başarısız.");
    }
  };

  const startEdit = (branch) => {
    setEditId(branch.id);
    setForm({
      name: branch.name,
      code: branch.code || "",
      address: branch.address || "",
      phone: branch.phone || "",
    });
  };

  const toggleActive = async (branch) => {
    try {
      await api.updateBranch(branch.id, { active: !branch.active });
      await load();
      await refreshBranches();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeBranch = async (branch) => {
    if (!window.confirm(`"${branch.name}" şubesini pasifleştirmek istiyor musunuz?`)) return;
    try {
      await api.deleteBranch(branch.id);
      setMessage("Şube pasifleştirildi.");
      await load();
      await refreshBranches();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <PageHeader title="Şube Yönetimi" />
      {message && <div className="alert alert-info">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <form className="card form-grid admin-branch-form" onSubmit={handleSubmit}>
        <h3>{editId ? "Şube Düzenle" : "Yeni Şube Ekle"}</h3>
        <label>Şube Adı *</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

        <label>Şube Kodu</label>
        <input
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          placeholder="Boş bırakılırsa otomatik"
        />

        <label>Adres</label>
        <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />

        <label>Telefon</label>
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

        <div className="form-actions">
          {editId && (
            <button type="button" className="btn btn-default" onClick={resetForm}>
              İptal
            </button>
          )}
          <button type="submit" className="btn btn-success">
            {editId ? "Güncelle" : "Şube Oluştur"}
          </button>
        </div>
      </form>

      <div className="card">
        <h3>Tüm Şubeler ({branches.length})</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Şube</th>
              <th>Kod</th>
              <th>Telefon</th>
              <th>Adres</th>
              <th>Durum</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td>{b.code || "—"}</td>
                <td>{b.phone || "—"}</td>
                <td>{b.address || "—"}</td>
                <td>{b.active ? "Aktif" : "Pasif"}</td>
                <td className="admin-actions">
                  <button type="button" className="btn btn-default btn-xs" onClick={() => startEdit(b)}>
                    Düzenle
                  </button>
                  <button type="button" className="btn btn-warning btn-xs" onClick={() => toggleActive(b)}>
                    {b.active ? "Pasifleştir" : "Aktifleştir"}
                  </button>
                  {b.active && (
                    <button type="button" className="btn btn-danger btn-xs" onClick={() => removeBranch(b)}>
                      Sil
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
