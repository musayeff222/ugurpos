import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import Modal from "../../components/ui/Modal";
import { formatMoney } from "../../utils/format";
import "../../styles/eleman.css";

const emptyForm = { firstName: "", lastName: "", phone: "", login: "", password: "" };

export default function AdminElemanList() {
  const [people, setPeople] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [edit, setEdit] = useState(null);
  const [open, setOpen] = useState(false);
  const [cashOpen, setCashOpen] = useState(null);
  const [cashAmount, setCashAmount] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => api.getElemanPeople().then(setPeople);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

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

  return (
    <div className="admin-page erp-page">
      <div className="crm-listbar">
        <div>
          <h2>Əlmanlar</h2>
          <span>{people.length} hesab</span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setEdit(null);
            setForm(emptyForm);
            setOpen(true);
            setMessage("");
          }}
        >
          Yeni əlman oluştur
        </button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}
      <section className="erp-panel erp-panel--flush">
        <div className="admin-table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Ad</th>
                <th>Telefon</th>
                <th>Login</th>
                <th>Kassa</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {people.map((person, index) => (
                <tr key={person.id}>
                  <td>{index + 1}</td>
                  <td>
                    {person.name}
                    {person.blocked ? " · bloklu" : ""}
                  </td>
                  <td>{person.phone || "—"}</td>
                  <td>{person.login}</td>
                  <td>
                    <button type="button" className="btn btn-link" onClick={() => setCashOpen(person)}>
                      {formatMoney(person.balance)}
                    </button>
                  </td>
                  <td>
                    <div className="staff-row-actions">
                      <button
                        type="button"
                        className="btn btn-default btn-sm"
                        title="Redaktə"
                        onClick={() => {
                          setEdit(person);
                          setForm({
                            firstName: person.firstName,
                            lastName: person.lastName,
                            phone: person.phone,
                            login: person.login,
                            password: "",
                          });
                          setOpen(true);
                        }}
                      >
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
              {!people.length && (
                <tr>
                  <td colSpan={6} className="erp-table__empty">
                    Hələ əlman yoxdur.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={open} title={edit ? "Əlmanı redaktə et" : "Yeni əlman"} onClose={() => setOpen(false)}>
        <form onSubmit={submit}>
          <label className="el-field">
            <span>Ad</span>
            <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          </label>
          <label className="el-field">
            <span>Soyad</span>
            <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </label>
          <label className="el-field">
            <span>Telefon</span>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="el-field">
            <span>Login</span>
            <input value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} required />
          </label>
          <label className="el-field">
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
          <p>{cashOpen?.name}</p>
          <label className="el-field">
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
