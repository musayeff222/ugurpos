import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import Modal from "../../components/ui/Modal";
import { formatDateTime, formatMoney } from "../../utils/format";

const FILTERS = [
  { id: "all", label: "Tümü" },
  { id: "debt", label: "Borçlu" },
  { id: "clear", label: "Borcu yok" },
];

const RECORD_TABS = [
  { id: "activity", label: "Aktivite" },
  { id: "purchases", label: "Alışlar" },
  { id: "prices", label: "Alış fiyatları" },
  { id: "info", label: "Bilgiler" },
];

const emptyForm = { name: "", phone: "", note: "" };

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name || "T").slice(0, 2).toUpperCase();
}

function paymentLabel(type) {
  if (type === "borc") return "Borç";
  if (type === "nagd") return "Nakit";
  if (type === "kart") return "Kart";
  return type || "—";
}

function when(value) {
  if (!value) return "—";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return String(value);
  return formatDateTime(date);
}

export default function AdminWholesalers({ wholesalers, kassas, onChanged, onStartPurchase }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [recordTab, setRecordTab] = useState("activity");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ kassaId: "", amount: "" });

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return wholesalers.filter((person) => {
      if (filter === "debt" && !(Number(person.debt) > 0)) return false;
      if (filter === "clear" && Number(person.debt) > 0) return false;
      if (!term) return true;
      return `${person.name} ${person.phone || ""} ${person.note || ""}`.toLowerCase().includes(term);
    });
  }, [wholesalers, query, filter]);

  const openDebt = wholesalers.reduce((sum, person) => sum + Number(person.debt || 0), 0);
  const purchaseTotal = wholesalers.reduce((sum, person) => sum + Number(person.purchaseTotal || 0), 0);
  const debtors = wholesalers.filter((person) => Number(person.debt) > 0).length;

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return undefined;
    }
    let alive = true;
    api
      .getWholesaler(selectedId)
      .then((next) => {
        if (alive) setDetail(next);
      })
      .catch((err) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [selectedId, wholesalers]);

  const activity = useMemo(() => {
    if (!detail) return [];
    const purchases = (detail.purchases || []).map((row) => ({
      id: `p-${row.id}`,
      at: row.createdAt,
      title: "Alış",
      text: row.lines.map((line) => `${line.qty} × ${line.name}`).join(", ") || "Ürün",
      amount: row.total,
      meta: `${paymentLabel(row.paymentType)}${row.kassaName ? ` · ${row.kassaName}` : ""}`,
    }));
    const payments = (detail.payments || []).map((row) => ({
      id: `d-${row.id}`,
      at: row.createdAt,
      title: "Borç ödemesi",
      text: row.note || "Kasadan ödendi",
      amount: row.amount,
      meta: row.kassaName || "Kasa",
    }));
    return [...purchases, ...payments].sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  }, [detail]);

  const openCreate = () => {
    setEditId("");
    setForm(emptyForm);
    setError("");
    setFormOpen(true);
  };

  const openEdit = () => {
    if (!detail) return;
    setEditId(detail.id);
    setForm({ name: detail.name || "", phone: detail.phone || "", note: detail.note || "" });
    setError("");
    setFormOpen(true);
  };

  const savePerson = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), phone: form.phone.trim(), note: form.note.trim() };
      if (editId) await api.updateWholesaler(editId, payload);
      else {
        const created = await api.createWholesaler(payload);
        setSelectedId(created.id);
      }
      setFormOpen(false);
      setMessage(editId ? "Toptancı güncellendi." : "Toptancı oluşturuldu.");
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const payDebt = async (event) => {
    event.preventDefault();
    if (!detail) return;
    setError("");
    setMessage("");
    setSaving(true);
    try {
      await api.payAccountDebt({
        wholesalerId: detail.id,
        kassaId: payForm.kassaId,
        amount: Number(payForm.amount),
      });
      setPayOpen(false);
      setPayForm({ kassaId: payForm.kassaId, amount: "" });
      setMessage("Borç ödemesi kasadan düşüldü.");
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const person = detail && detail.id === selectedId ? detail : wholesalers.find((row) => row.id === selectedId);

  return (
    <div className="crm-suppliers">
      <div className="crm-listbar">
        <div>
          <h2>Toptancılar</h2>
          <span>
            {rows.length} / {wholesalers.length} hesap
          </span>
        </div>
        <div className="crm-listbar__tools">
          <form className="crm-global-search crm-global-search--inline" onSubmit={(e) => e.preventDefault()}>
            <i className="fa fa-search" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ad, telefon, not..." />
          </form>
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            Toptancı oluştur
          </button>
        </div>
      </div>

      {error && !formOpen && !payOpen && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}

      <div className="crm-metrics crm-metrics--4">
        <article>
          <span>Hesap</span>
          <strong>{wholesalers.length}</strong>
          <small>kayıtlı toptancı</small>
        </article>
        <article>
          <span>Açık borç</span>
          <strong>{formatMoney(openDebt)}</strong>
          <small>{debtors} borçlu hesap</small>
        </article>
        <article>
          <span>Toplam alış</span>
          <strong>{formatMoney(purchaseTotal)}</strong>
          <small>tüm ödemeler</small>
        </article>
        <article>
          <span>Borcu yok</span>
          <strong>{wholesalers.length - debtors}</strong>
          <small>kapalı hesap</small>
        </article>
      </div>

      <div className="crm-supplier-filters">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={filter === item.id ? "active" : ""}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="crm-workspace">
        <aside className="crm-rail">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              className={selectedId === row.id ? "crm-rail__item active" : "crm-rail__item"}
              onClick={() => {
                setSelectedId(row.id);
                setRecordTab("activity");
                setError("");
                setMessage("");
              }}
            >
              <span className="crm-avatar">{initials(row.name)}</span>
              <span className="crm-rail__body">
                <strong>{row.name}</strong>
                <small>{row.phone || "Telefon yok"}</small>
              </span>
              <span className="crm-rail__side">
                <b>{Number(row.debt) > 0 ? formatMoney(row.debt) : "—"}</b>
                <small>{Number(row.debt) > 0 ? "borç" : "temiz"}</small>
              </span>
            </button>
          ))}
          {!rows.length && <p className="crm-rail__empty">Bu filtrede toptancı yok.</p>}
        </aside>

        <section className="crm-stage">
          {!person && (
            <div className="crm-stage__empty">
              <h3>Hesap seçin</h3>
              <p>Soldan bir toptancı açın ya da yeni hesap oluşturun. Alışlar, borç ve kayıtlı fiyatlar burada durur.</p>
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                Toptancı oluştur
              </button>
            </div>
          )}

          {person && (
            <>
              <section className="crm-record">
                <div className="crm-record__top">
                  <div className="crm-record__id">
                    <span className="crm-avatar crm-avatar--lg">{initials(person.name)}</span>
                    <div>
                      <p className="crm-object">Hesap · Toptancı</p>
                      <h2>{person.name}</h2>
                      <p className="crm-record__meta">
                        {person.phone || "Telefon yok"}
                        {person.note ? ` · ${person.note}` : ""}
                      </p>
                    </div>
                    <span className={`admin-badge ${Number(person.debt) > 0 ? "pending" : "ok"}`}>
                      {Number(person.debt) > 0 ? "Borçlu" : "Kapalı"}
                    </span>
                  </div>
                  <div className="crm-record__actions">
                    <button type="button" className="btn btn-default btn-sm" onClick={openEdit}>
                      Düzenle
                    </button>
                    <button
                      type="button"
                      className="btn btn-default btn-sm"
                      disabled={!(Number(person.debt) > 0)}
                      onClick={() => {
                        setPayForm({
                          kassaId: kassas.find((kassa) => kassa.kind === "nakit")?.id || kassas[0]?.id || "",
                          amount: "",
                        });
                        setPayOpen(true);
                      }}
                    >
                      Borç öde
                    </button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => onStartPurchase(person.id)}>
                      Yeni alış
                    </button>
                  </div>
                </div>
                <dl className="crm-highlights">
                  <div>
                    <dt>Açık borç</dt>
                    <dd>{formatMoney(person.debt)}</dd>
                    <small>ödenen {formatMoney(person.debtPaid || 0)}</small>
                  </div>
                  <div>
                    <dt>Toplam alış</dt>
                    <dd>{formatMoney(person.purchaseTotal || 0)}</dd>
                    <small>{person.purchaseCount || 0} fiş</small>
                  </div>
                  <div>
                    <dt>Son alış</dt>
                    <dd>{person.lastPurchaseAt ? when(person.lastPurchaseAt) : "—"}</dd>
                    <small>kayıt tarihi</small>
                  </div>
                  <div>
                    <dt>Telefon</dt>
                    <dd>{person.phone || "—"}</dd>
                    <small>{person.createdAt ? when(person.createdAt) : "hesap"}</small>
                  </div>
                </dl>
              </section>

              <ul className="admin-tabs erp-tabs">
                {RECORD_TABS.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={recordTab === item.id ? "active" : ""}
                      onClick={() => setRecordTab(item.id)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>

              {recordTab === "activity" && (
                <section className="erp-panel erp-panel--flush">
                  {activity.length === 0 && <p className="crm-stage__note">Henüz hareket yok.</p>}
                  <ol className="crm-timeline">
                    {activity.map((item) => (
                      <li key={item.id}>
                        <span className="crm-timeline__dot" />
                        <article className="crm-timeline__card">
                          <header>
                            <strong>{item.title}</strong>
                            <span>{formatMoney(item.amount)}</span>
                          </header>
                          <p>{item.text}</p>
                          <small>
                            {when(item.at)} · {item.meta}
                          </small>
                        </article>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {recordTab === "purchases" && (
                <section className="erp-panel erp-panel--flush">
                  <div className="admin-table-wrap">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>Tarih</th>
                          <th>Ödeme</th>
                          <th>Ürünler</th>
                          <th>Tutar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detail?.purchases || []).map((row) => (
                          <tr key={row.id}>
                            <td>{when(row.createdAt)}</td>
                            <td>
                              {paymentLabel(row.paymentType)}
                              {row.kassaName ? ` · ${row.kassaName}` : ""}
                            </td>
                            <td>{row.lines.map((line) => `${line.qty} × ${line.name}`).join(", ")}</td>
                            <td>{formatMoney(row.total)}</td>
                          </tr>
                        ))}
                        {!(detail?.purchases || []).length && (
                          <tr>
                            <td colSpan={4} className="erp-table__empty">
                              Alış kaydı yok.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {recordTab === "prices" && (
                <section className="erp-panel erp-panel--flush">
                  <div className="admin-table-wrap">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>Ürün</th>
                          <th>Son alış fiyatı</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detail?.prices || []).map((row) => (
                          <tr key={row.productId}>
                            <td>{row.name}</td>
                            <td>{formatMoney(row.buyPrice)}</td>
                          </tr>
                        ))}
                        {!(detail?.prices || []).length && (
                          <tr>
                            <td colSpan={2} className="erp-table__empty">
                              Bu toptancıdan henüz fiyat kaydı yok. Yeni alışta girilen fiyat burada saklanır.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {recordTab === "info" && (
                <section className="erp-panel">
                  <div className="crm-info-grid">
                    <div>
                      <span>Ad</span>
                      <strong>{person.name}</strong>
                    </div>
                    <div>
                      <span>Telefon</span>
                      <strong>{person.phone || "—"}</strong>
                    </div>
                    <div>
                      <span>Not</span>
                      <strong>{person.note || "—"}</strong>
                    </div>
                    <div>
                      <span>Açılış</span>
                      <strong>{person.createdAt ? when(person.createdAt) : "—"}</strong>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </section>
      </div>

      <Modal open={formOpen} size="lg" title={editId ? "Toptancıyı düzenle" : "Yeni toptancı"} onClose={() => setFormOpen(false)}>
        <form className="erp-form" onSubmit={savePerson}>
          {error && formOpen && <div className="alert alert-danger">{error}</div>}
          <div className="erp-form-grid">
            <label className="erp-field">
              <span>Ad *</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="erp-field">
              <span>Telefon</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="erp-field erp-field--full">
              <span>Not</span>
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Adres, yetkili, vade..."
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setFormOpen(false)}>
              Vazgeç
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Kaydet
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={payOpen} title="Borç öde" onClose={() => setPayOpen(false)}>
        <form className="erp-form" onSubmit={payDebt}>
          {error && <div className="alert alert-danger">{error}</div>}
          <p className="hint-text">{person ? `${person.name} · açık borç ${formatMoney(person.debt)}` : ""}</p>
          <div className="erp-form-grid">
            <label className="erp-field">
              <span>Kasa</span>
              <select value={payForm.kassaId} onChange={(e) => setPayForm({ ...payForm, kassaId: e.target.value })}>
                {kassas.map((kassa) => (
                  <option key={kassa.id} value={kassa.id}>
                    {kassa.name} · {formatMoney(kassa.balance)}
                  </option>
                ))}
              </select>
            </label>
            <label className="erp-field">
              <span>Tutar</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                required
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setPayOpen(false)}>
              Vazgeç
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Öde
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
