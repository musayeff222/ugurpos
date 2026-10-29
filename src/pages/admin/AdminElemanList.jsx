import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import Modal from "../../components/ui/Modal";
import { formatMoney } from "../../utils/format";

const emptyForm = { firstName: "", lastName: "", phone: "", login: "", password: "" };

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name || "ƏL").slice(0, 2).toUpperCase();
}

export default function AdminElemanList() {
  const [people, setPeople] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [edit, setEdit] = useState(null);
  const [open, setOpen] = useState(false);
  const [cashOpen, setCashOpen] = useState(null);
  const [cashAmount, setCashAmount] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => api.getElemanPeople().then(setPeople);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return people;
    return people.filter((person) => {
      const hay = `${person.name} ${person.login} ${person.phone}`.toLowerCase();
      return hay.includes(term);
    });
  }, [people, query]);

  const totalMain = people.reduce((sum, person) => sum + Number(person.balance || 0), 0);
  const totalFranchise = people.reduce((sum, person) => sum + Number(person.franchiseBalance || 0), 0);
  const withStock = people.filter((person) => Number(person.stockCount || 0) > 0).length;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      if (edit) {
        await api.updateElemanPerson(edit.id, form);
        setMessage("Əlman məlumatları yeniləndi.");
      } else {
        await api.createElemanPerson(form);
        setMessage("Əlman uğurla yaradıldı.");
      }
      setForm(emptyForm);
      setEdit(null);
      setOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const block = async (person) => {
    setError("");
    setSaving(true);
    try {
      if (person.blocked) await api.unblockElemanPerson(person.id);
      else await api.blockElemanPerson(person.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addCash = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.addElemanCash(cashOpen.id, { amount: Number(cashAmount) });
      setCashOpen(null);
      setCashAmount("");
      setMessage("Kassaya pul əlavə olundu.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEdit(null);
    setForm(emptyForm);
    setOpen(true);
    setMessage("");
  };

  const openEdit = (person) => {
    setEdit(person);
    setForm({
      firstName: person.firstName,
      lastName: person.lastName,
      phone: person.phone,
      login: person.login,
      password: "",
    });
    setOpen(true);
  };

  return (
    <div className="admin-page erp-page">
      <div className="crm-listbar">
        <div>
          <h2>Əlmanlar</h2>
          <span>
            {rows.length} / {people.length} hesab
          </span>
        </div>
        <div className="crm-listbar__tools">
          <form className="crm-global-search crm-global-search--inline" onSubmit={(e) => e.preventDefault()}>
            <i className="fa fa-search" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ad, login, telefon..." />
          </form>
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            Yeni əlman
          </button>
        </div>
      </div>

      {error && !open && !cashOpen && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}

      <div className="crm-metrics crm-metrics--4">
        <article>
          <span>Əlman</span>
          <strong>{people.length}</strong>
          <small>hesab</small>
        </article>
        <article>
          <span>Əsas kassa</span>
          <strong>{formatMoney(totalMain)}</strong>
          <small>cəmi</small>
        </article>
        <article>
          <span>Franchise kassası</span>
          <strong>{formatMoney(totalFranchise)}</strong>
          <small>cəmi</small>
        </article>
        <article>
          <span>Anbarı olan</span>
          <strong>{withStock}</strong>
          <small>əlində məhsul var</small>
        </article>
      </div>

      <section className="erp-panel erp-panel--flush">
        <div className="admin-table-wrap admin-table-wrap--desktop-only">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Əlman</th>
                <th>Durum</th>
                <th>Əsas kassa</th>
                <th>Franchise</th>
                <th>Anbar</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((person) => (
                <tr key={person.id}>
                  <td>
                    <Link className="crm-account" to={`/admin/eleman/${person.id}`}>
                      <span className="crm-avatar">{initials(person.name)}</span>
                      <span>
                        <strong>{person.name}</strong>
                        <small>
                          {person.login}
                          {person.phone ? ` · ${person.phone}` : ""}
                        </small>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <span className={`admin-badge ${person.blocked ? "off" : "ok"}`}>
                      {person.blocked ? "Bloklu" : "Aktiv"}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="btn btn-link" onClick={() => setCashOpen(person)}>
                      {formatMoney(person.balance)}
                    </button>
                  </td>
                  <td>{formatMoney(person.franchiseBalance || 0)}</td>
                  <td>
                    <Link className="btn btn-primary btn-sm" to={`/admin/eleman/${person.id}/stok`}>
                      Anbar
                    </Link>
                    <small style={{ display: "block", marginTop: 4 }}>
                      {Number(person.stockCount || 0) > 0 ? `${person.stockCount} məhsul` : "Yox"}
                    </small>
                  </td>
                  <td>
                    <div className="staff-row-actions">
                      <button type="button" className="btn btn-default btn-sm" title="Redaktə" onClick={() => openEdit(person)}>
                        <i className="fa fa-pencil" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-default btn-sm"
                        title={person.blocked ? "Bloku aç" : "Blokla"}
                        onClick={() => block(person)}
                      >
                        <i className={`fa ${person.blocked ? "fa-unlock" : "fa-ban"}`} />
                      </button>
                      <Link className="btn btn-default btn-sm" to={`/admin/eleman/${person.id}`} title="Əməliyyatlar">
                        <i className="fa fa-eye" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="erp-table__empty">
                    {people.length ? "Bu aramada sonuç yok." : "Hələ əlman yoxdur."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-branch-grid admin-mobile-list">
          {rows.map((person) => (
            <div key={person.id} className={`admin-branch-card ${person.blocked ? "inactive" : ""}`}>
              <Link
                to={`/admin/eleman/${person.id}`}
                className="admin-branch-card--link"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="admin-branch-card__head">
                  <div>
                    <h3>{person.name}</h3>
                    <span className="admin-branch-email">
                      {person.login}
                      {person.phone ? ` · ${person.phone}` : ""}
                    </span>
                  </div>
                  <span className={`admin-badge ${person.blocked ? "off" : "ok"}`}>
                    {person.blocked ? "Bloklu" : "Aktiv"}
                  </span>
                </div>
                <div className="admin-branch-card__stats admin-branch-card__stats--2">
                  <div>
                    <span>Əsas kassa</span>
                    <strong>{formatMoney(person.balance)}</strong>
                  </div>
                  <div>
                    <span>Anbar</span>
                    <strong>{Number(person.stockCount || 0) > 0 ? person.stockCount : "Yox"}</strong>
                  </div>
                </div>
              </Link>
              <div style={{ display: "flex", gap: 8, padding: "0 12px 12px" }}>
                <Link className="btn btn-primary btn-sm" to={`/admin/eleman/${person.id}/stok`}>
                  Anbar
                </Link>
                <button type="button" className="btn btn-default btn-sm" onClick={() => setCashOpen(person)}>
                  Kassa
                </button>
                <button type="button" className="btn btn-default btn-sm" onClick={() => openEdit(person)}>
                  Redaktə
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Modal open={open} title={edit ? "Əlmanı redaktə et" : "Yeni əlman"} onClose={() => setOpen(false)}>
        <form onSubmit={submit}>
          {error && open ? <div className="alert alert-danger">{error}</div> : null}
          <label className="erp-field">
            <span>Ad</span>
            <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          </label>
          <label className="erp-field">
            <span>Soyad</span>
            <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </label>
          <label className="erp-field">
            <span>Telefon</span>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="erp-field">
            <span>Login</span>
            <input value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} required />
          </label>
          <label className="erp-field">
            <span>{edit ? "Yeni parol (boş qala bilər)" : "Parol"}</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!edit}
            />
          </label>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setOpen(false)}>
              Bağla
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Yadda saxla
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(cashOpen)} title="Kassaya pul qoy" onClose={() => setCashOpen(null)}>
        <form onSubmit={addCash}>
          {error && cashOpen ? <div className="alert alert-danger">{error}</div> : null}
          <p>{cashOpen?.name}</p>
          <label className="erp-field">
            <span>Məbləğ</span>
            <input type="number" min="0.01" step="0.01" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} required />
          </label>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setCashOpen(null)}>
              Bağla
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Əlavə et
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
