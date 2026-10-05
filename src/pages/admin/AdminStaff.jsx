import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import Modal from "../../components/ui/Modal";
import { useAuth } from "../../context/AuthContext";
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
  commissionPercent: "",
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

function formatHours(value) {
  const n = Number(value) || 0;
  if (n <= 0) return "—";
  return `${n.toFixed(n % 1 === 0 ? 0 : 1)} saat`;
}

function personName(person) {
  return `${person.name || ""} ${person.surname || ""}`.trim() || "—";
}

function topBy(list, key) {
  if (!list.length) return null;
  return [...list].sort((a, b) => Number(b[key] || 0) - Number(a[key] || 0))[0];
}

export default function AdminStaff() {
  const navigate = useNavigate();
  const { enterStaffAsAdmin } = useAuth();
  const [branches, setBranches] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [enteringStaffId, setEnteringStaffId] = useState("");

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

  const topSeller = useMemo(() => topBy(staff, "todayTotal"), [staff]);
  const topHours = useMemo(() => topBy(staff, "todayHours"), [staff]);

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
      setFormOpen(false);
      setEditId(null);
      setForm({ ...emptyForm, branchId: form.branchId });
      setMessage(editId ? "Çalışan güncellendi." : "Çalışan oluşturuldu ve seçilen şubeye atandı.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditId(null);
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm, branchId: branches[0]?.id || "" });
    setError("");
    setFormOpen(true);
  };

  const startEdit = (person) => {
    setEditId(person.id);
    setError("");
    setFormOpen(true);
    setForm({
      name: person.name,
      surname: person.surname,
      phone: person.phone,
      branchId: person.branchId,
      login: person.login,
      password: "",
      role: person.role || "Kasiyer",
      salary: person.salary || "",
      commissionPercent:
        person.commissionPercent != null && person.commissionPercent !== ""
          ? String(person.commissionPercent)
          : "",
      startedAt: toInputDateTime(person.startedAt),
    });
    setMessage("");
  };

  const handleEnterStaff = async (person) => {
    setEnteringStaffId(person.id);
    setError("");
    try {
      if (person.branchId) sessionStorage.setItem("ugurpos_admin_last_branch", person.branchId);
      await enterStaffAsAdmin(person.id);
      navigate("/sales");
    } catch (err) {
      setError(err.message);
    } finally {
      setEnteringStaffId("");
    }
  };

  return (
    <div className="admin-page erp-page">
      <div className="crm-listbar">
        <div>
          <h2>Çalışanlar</h2>
          <span>Günlük ciro primi: 220→2, 250→4, 300→6, 350→8 AZN</span>
        </div>
        <div className="crm-listbar__tools">
          <form className="crm-global-search crm-global-search--inline" onSubmit={(e) => e.preventDefault()}>
            <i className="fa fa-search" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ad, login, şube..." />
          </form>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Çalışan oluştur
          </button>
        </div>
      </div>

      {error && !formOpen && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}

      <div className="crm-metrics crm-metrics--4 staff-rank-metrics">
        <article>
          <span>Bugün ən çox satan</span>
          <strong>{topSeller && Number(topSeller.todayTotal) > 0 ? personName(topSeller) : "—"}</strong>
          <small>
            {topSeller && Number(topSeller.todayTotal) > 0
              ? `${formatMoney(topSeller.todayTotal)} · ${topSeller.todayCount || 0} satış`
              : "Hələ satış yoxdur"}
          </small>
        </article>
        <article>
          <span>Bugün ən çox işləyən</span>
          <strong>{topHours && Number(topHours.todayHours) > 0 ? personName(topHours) : "—"}</strong>
          <small>
            {topHours && Number(topHours.todayHours) > 0
              ? formatHours(topHours.todayHours)
              : "Növbə/satış məlumatı yoxdur"}
          </small>
        </article>
        <article>
          <span>Bu ay ümumi satış</span>
          <strong>{formatMoney(staff.reduce((sum, p) => sum + Number(p.monthTotal || 0), 0))}</strong>
          <small>{staff.reduce((sum, p) => sum + Number(p.monthCount || 0), 0)} satış</small>
        </article>
        <article>
          <span>Bu ay ümumi prim</span>
          <strong>{formatMoney(staff.reduce((sum, p) => sum + Number(p.monthCiroBonus || 0), 0))}</strong>
          <small>Hər günün ciro pilləsi</small>
        </article>
      </div>

      <section className="erp-panel erp-panel--flush">
          <div className="admin-table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Çalışan</th>
                  <th>Şube</th>
                  <th>Bugün satış</th>
                  <th>Bugün saat</th>
                  <th>Bu ay satış</th>
                  <th>Bugün prim</th>
                  <th>Bu ay prim</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((person) => (
                  <tr key={person.id}>
                    <td data-label="Çalışan">
                      <strong>
                        {person.name} {person.surname}
                      </strong>
                      <small>
                        {roleLabel(person.role)} · {person.login || "—"}
                      </small>
                    </td>
                    <td data-label="Şube">
                      <Link to={`/admin/branches/${person.branchId}`}>
                        {getBranchLabel({ name: person.branchName }) || person.branchName}
                      </Link>
                    </td>
                    <td data-label="Bugün satış">
                      <strong>{formatMoney(person.todayTotal || 0)}</strong>
                      <small>{person.todayCount || 0} satış</small>
                    </td>
                    <td data-label="Bugün saat">{formatHours(person.todayHours)}</td>
                    <td data-label="Bu ay satış">
                      <strong>{formatMoney(person.monthTotal || 0)}</strong>
                      <small>{person.monthCount || 0} satış</small>
                    </td>
                    <td data-label="Bugün prim">
                      <strong>{formatMoney(person.todayCiroBonus || 0)}</strong>
                    </td>
                    <td data-label="Bu ay prim">
                      <strong>{formatMoney(person.monthCiroBonus || 0)}</strong>
                    </td>
                    <td data-label="">
                      <div className="staff-row-actions">
                        <button type="button" className="btn btn-default btn-sm" onClick={() => startEdit(person)}>
                          Aç
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={enteringStaffId === person.id}
                          onClick={() => handleEnterStaff(person)}
                        >
                          {enteringStaffId === person.id ? "..." : "Hesaba keç"}
                        </button>
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
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={8} className="erp-table__empty">
                      Henüz çalışan yok. Çalışan oluştur düğmesine basın.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
      </section>

      <Modal
        open={formOpen}
        size="lg"
        title={editId ? "Çalışanı düzenle" : "Yeni çalışan"}
        onClose={closeForm}
      >
        <form className="erp-form" onSubmit={save}>
          <p className="hint-text">
            Prim % aylıq satış məbləğinə vurulur (məs. 5% → satış × 0.05). Növbə saatları giriş/çıxışdan hesablanır.
          </p>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="erp-form-grid">
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
          </div>
          <div className="staff-form-preview">
            <div>
              <span>220–249</span>
              <strong>2 AZN</strong>
            </div>
            <div>
              <span>250–299</span>
              <strong>4 AZN</strong>
            </div>
            <div>
              <span>300–349</span>
              <strong>6 AZN</strong>
            </div>
            <div>
              <span>350+</span>
              <strong>8 AZN</strong>
            </div>
          </div>
          {editId && (
            <div className="staff-form-preview">
              <div>
                <span>Bugün ciro</span>
                <strong>{formatMoney(staff.find((p) => p.id === editId)?.todayTotal || 0)}</strong>
              </div>
              <div>
                <span>Bugün prim</span>
                <strong>{formatMoney(staff.find((p) => p.id === editId)?.todayCiroBonus || 0)}</strong>
              </div>
              <div>
                <span>Bu ay prim</span>
                <strong>{formatMoney(staff.find((p) => p.id === editId)?.monthCiroBonus || 0)}</strong>
              </div>
            </div>
          )}
          <div className="form-actions">
            <button type="button" className="btn btn-default" onClick={closeForm}>
              Vazgeç
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Kaydediliyor..." : editId ? "Güncelle" : "Çalışan oluştur"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
