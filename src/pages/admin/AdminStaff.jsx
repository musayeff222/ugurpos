import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { getBranchLabel } from "../../utils/branchDisplay";
import { formatMoney } from "../../utils/format";

const emptyForm = {
  name: "",
  surname: "",
  phone: "",
  branchId: "",
  login: "",
  password: "",
  role: "Kasiyer",
  salary: "",
  startedAt: "",
};

const ROLE_OPTIONS = [
  { value: "Kasiyer", label: "Kasa" },
  { value: "Garson", label: "Garson" },
  { value: "Personal", label: "Personal" },
];

function roleLabel(role) {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label || role || "—";
}

function toInputDateTime(value) {
  if (!value) return "";
  return String(value).slice(0, 16);
}

export default function AdminStaff() {
  const [branches, setBranches] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [branchList, people] = await Promise.all([api.getAdminBranches(), api.getAdminStaff()]);
    setBranches(branchList);
    setStaff(people);
    setForm((prev) => (prev.branchId || !branchList[0] ? prev : { ...prev, branchId: branchList[0].id }));
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return staff;
    return staff.filter((person) => {
      const hay = `${person.name} ${person.surname} ${person.login} ${person.phone} ${person.branchName}`.toLowerCase();
      return hay.includes(term);
    });
  }, [staff, query]);

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!form.name.trim() || !form.branchId || !form.login.trim()) {
      setError("Ad, şube ve login zorunludur.");
      return;
    }
    if (!editId && !form.password.trim()) {
      setError("Yeni çalışan için parola zorunludur.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        surname: form.surname.trim(),
        phone: form.phone.trim(),
        branchId: form.branchId,
        login: form.login.trim(),
        role: form.role,
        salary: Number(form.salary) || 0,
        startedAt: form.startedAt || "",
      };
      if (form.password.trim()) payload.password = form.password.trim();
      if (editId) await api.updateAdminStaff(editId, payload);
      else await api.createAdminStaff(payload);
      await load();
      setEditId(null);
      setForm({ ...emptyForm, branchId: form.branchId });
      setMessage(editId ? "Çalışan güncellendi." : "Çalışan oluşturuldu ve seçilen şubeye atandı.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (person) => {
    setEditId(person.id);
    setForm({
      name: person.name,
      surname: person.surname,
      phone: person.phone,
      branchId: person.branchId,
      login: person.login,
      password: "",
      role: person.role || "Kasiyer",
      salary: person.salary || "",
      startedAt: toInputDateTime(person.startedAt),
    });
    setMessage("");
  };

  return (
    <div className="admin-page erp-page">
      <div className="crm-listbar">
        <div>
          <h2>Çalışanlar</h2>
          <span>Firma personeli · şubeye atanır</span>
        </div>
        <div className="crm-listbar__tools">
          <form className="crm-global-search crm-global-search--inline" onSubmit={(e) => e.preventDefault()}>
            <i className="fa fa-search" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ad, login, şube..." />
          </form>
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
                  <th>Çalışan</th>
                  <th>Şube</th>
                  <th>Görev</th>
                  <th>Maaş</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <strong>
                        {person.name} {person.surname}
                      </strong>
                      <small>
                        {person.login}
                        {person.phone ? ` · ${person.phone}` : ""}
                      </small>
                    </td>
                    <td>
                      <Link to={`/admin/branches/${person.branchId}`}>
                        {getBranchLabel({ name: person.branchName }) || person.branchName}
                      </Link>
                    </td>
                    <td>{roleLabel(person.role)}</td>
                    <td>{formatMoney(person.salary || 0)}</td>
                    <td>
                      <button type="button" className="btn btn-default btn-sm" onClick={() => startEdit(person)}>
                        Aç
                      </button>{" "}
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={async () => {
                          if (!window.confirm("Bu çalışanı silmek istiyor musunuz?")) return;
                          try {
                            await api.deleteAdminStaff(person.id);
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
                    <td colSpan={5} className="erp-table__empty">
                      Henüz çalışan yok. Sağdaki formdan ekleyin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <form className="erp-panel erp-form" onSubmit={save}>
          <header className="erp-panel__head">
            <h3>{editId ? "Çalışanı düzenle" : "Yeni çalışan"}</h3>
          </header>
          <label className="erp-field">
            <span>Ad *</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="erp-field">
            <span>Soyad</span>
            <input value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} />
          </label>
          <label className="erp-field">
            <span>Telefon</span>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="erp-field">
            <span>Çalışacağı şube *</span>
            <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} required>
              <option value="">Seçin</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {getBranchLabel(b)}
                </option>
              ))}
            </select>
          </label>
          <label className="erp-field">
            <span>Login *</span>
            <input
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
              autoComplete="off"
              required
            />
          </label>
          <label className="erp-field">
            <span>{editId ? "Yeni parola (boş = değişmez)" : "Parola *"}</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              required={!editId}
            />
          </label>
          <label className="erp-field">
            <span>Görev *</span>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="erp-field">
            <span>İşe başlama</span>
            <input
              type="datetime-local"
              value={form.startedAt}
              onChange={(e) => setForm({ ...form, startedAt: e.target.value })}
            />
          </label>
          <label className="erp-field">
            <span>Aylık maaş</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.salary}
              onChange={(e) => setForm({ ...form, salary: e.target.value })}
              placeholder="Örn: 800"
            />
            <small>Anlaşılan aylık ücret. Kassadan otomatik çıxmaz.</small>
          </label>
          <div className="form-actions">
            {editId && (
              <button
                type="button"
                className="btn btn-default"
                onClick={() => {
                  setEditId(null);
                  setForm({ ...emptyForm, branchId: branches[0]?.id || "" });
                }}
              >
                Yeni
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Kaydediliyor..." : editId ? "Güncelle" : "Çalışan oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
