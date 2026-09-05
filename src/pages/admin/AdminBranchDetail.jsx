import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { getBranchLabel } from "../../utils/branchDisplay";
import { formatDateTime, formatMoney } from "../../utils/format";
import Modal from "../../components/ui/Modal";

const PAYMENT_LABELS = {
  cash: "Nakit",
  pos: "Kredi / POS",
  open: "Açık hesap",
  partial: "Parçalı",
  refund: "İade",
};

const TABS = [
  { id: "stock", label: "Anbar" },
  { id: "cash", label: "Kasa" },
  { id: "expenses", label: "Xərclər" },
  { id: "reports", label: "Hesabat" },
  { id: "staff", label: "Çalışanlar" },
  { id: "settings", label: "Ayarlar" },
];

export default function AdminBranchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { enterBranchAsAdmin } = useAuth();

  const [tab, setTab] = useState("stock");
  const [branch, setBranch] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [form, setForm] = useState({
    name: "",
    branchNo: "",
    email: "",
    password: "",
    address: "",
    lat: "",
    lng: "",
    businessOpenTime: "08:00",
    businessCloseTime: "17:00",
  });
  const [stockEdits, setStockEdits] = useState({});
  const [salaryEdits, setSalaryEdits] = useState({});
  const [sale, setSale] = useState(null);
  const [message, setMessage] = useState(location.state?.message || "");
  const [error, setError] = useState("");
  const [entering, setEntering] = useState(false);
  const [savingId, setSavingId] = useState("");

  const loadBranch = async () => {
    const data = await api.getAdminBranch(id);
    setBranch(data);
    setForm({
      name: data.name,
      branchNo: data.branchNo || "",
      email: data.email || "",
      password: "",
      address: data.address || "",
      lat: data.lat != null ? String(data.lat) : "",
      lng: data.lng != null ? String(data.lng) : "",
      businessOpenTime: data.businessOpenTime || "08:00",
      businessCloseTime: data.businessCloseTime || "17:00",
    });
  };

  const loadWorkspace = async () => {
    const data = await api.getAdminBranchWorkspace(id);
    setWorkspace(data);
    setStockEdits({});
    setSalaryEdits({});
  };

  useEffect(() => {
    Promise.all([loadBranch(), loadWorkspace()]).catch((e) => setError(e.message));
  }, [id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      const updated = await api.updateBranch(id, payload);
      setBranch((prev) => ({ ...prev, ...updated }));
      setForm((prev) => ({ ...prev, password: "" }));
      setMessage(payload.password ? "Şube ayarları ve şifre güncellendi." : "Şube bilgileri güncellendi.");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEnterPos = async () => {
    setEntering(true);
    setError("");
    try {
      sessionStorage.setItem("ugurpos_admin_last_branch", id);
      await enterBranchAsAdmin(id);
      navigate("/sales");
    } catch (err) {
      setError(err.message);
    } finally {
      setEntering(false);
    }
  };

  const toggleActive = async () => {
    try {
      await api.updateBranch(id, { active: !branch.active });
      await loadBranch();
      setMessage(branch.active ? "Şube pasifleştirildi." : "Şube aktifleştirildi.");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    const nextLabel = getBranchLabel(branch);
    if (!window.confirm(`"${nextLabel}" şubesini silmek istediğinize emin misiniz?`)) return;
    setMessage("");
    setError("");
    try {
      await api.deleteBranch(id);
      navigate("/admin/branches", { state: { message: "Şube silindi." } });
    } catch (err) {
      setError(err.message);
    }
  };

  const saveProduct = async (product) => {
    const edit = stockEdits[product.id] || {};
    const patch = {};
    if (edit.price1 != null && edit.price1 !== "") patch.price1 = Number(edit.price1);
    if (edit.addStock != null && edit.addStock !== "") patch.addStock = Number(edit.addStock);
    if (!Object.keys(patch).length) return;
    setSavingId(product.id);
    setError("");
    try {
      await api.updateAdminBranchProduct(id, product.id, patch);
      await loadWorkspace();
      setMessage(`${product.name} güncellendi.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId("");
    }
  };

  const saveSalary = async (person) => {
    const value = salaryEdits[person.id];
    if (value == null || value === "") return;
    setSavingId(person.id);
    try {
      await api.updateAdminBranchStaff(id, person.id, { salary: Number(value) });
      await loadWorkspace();
      setMessage("Maaş güncellendi.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId("");
    }
  };

  if (!branch && !error) return <div className="erp-panel">Yükleniyor...</div>;

  const label = branch ? getBranchLabel(branch) : "Hesap";
  const report = workspace?.report;

  return (
    <div className="admin-page erp-page">
      {message && <div className="alert alert-info">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {branch && (
        <>
          <section className="crm-record">
            <div className="crm-record__top">
              <div className="crm-record__id">
                <span className="crm-avatar crm-avatar--lg">{String(label).slice(0, 2).toUpperCase()}</span>
                <div>
                  <p className="crm-object">Hesap · Şube</p>
                  <h2>{label}</h2>
                  <p className="crm-record__meta">
                    {branch.email || "—"}
                    {branch.branchNo ? ` · #${branch.branchNo}` : ""}
                    {branch.address ? ` · ${branch.address}` : ""}
                  </p>
                </div>
                <span className={`admin-badge ${branch.active ? "ok" : "off"}`}>
                  {branch.active ? "Aktif" : "Pasif"}
                </span>
              </div>
              <div className="crm-record__actions">
                <Link to="/admin/branches" className="btn btn-default btn-sm">
                  Liste
                </Link>
                {branch.active && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleEnterPos} disabled={entering}>
                    {entering ? "..." : "Şubeye geç"}
                  </button>
                )}
              </div>
            </div>
            <dl className="crm-highlights">
              <div>
                <dt>Bugün</dt>
                <dd>{formatMoney(branch.stats?.todayTotal || 0)}</dd>
                <small>{branch.stats?.todayCount || 0} satış</small>
              </div>
              <div>
                <dt>Bu ay</dt>
                <dd>{formatMoney(branch.stats?.monthTotal || 0)}</dd>
                <small>{branch.stats?.monthCount || 0} satış</small>
              </div>
              <div>
                <dt>Anbar</dt>
                <dd>{workspace?.products?.length || branch.stats?.productCount || 0}</dd>
                <small>ürün</small>
              </div>
              <div>
                <dt>Kasa xərc</dt>
                <dd>{formatMoney(report?.withdrawalTotal || 0)}</dd>
                <small>{workspace?.withdrawals?.length || 0} kayıt</small>
              </div>
            </dl>
          </section>

          <ul className="admin-tabs erp-tabs">
            {TABS.map((item) => (
              <li key={item.id}>
                <button type="button" className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          {tab === "stock" && (
            <section className="erp-panel erp-panel--flush">
              <div className="admin-table-wrap">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Ürün</th>
                      <th>Grup</th>
                      <th>Stokta kalan</th>
                      <th>Fiyat</th>
                      <th>Stok ekle</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(workspace?.products || []).map((p) => {
                      const edit = stockEdits[p.id] || {};
                      return (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.name}</strong>
                            {p.stock <= p.criticalStock && <small>kritik stok</small>}
                          </td>
                          <td>{p.groupName || "—"}</td>
                          <td>{p.stock}</td>
                          <td>
                            <input
                              className="crm-inline-input"
                              type="number"
                              step="0.01"
                              value={edit.price1 ?? p.price1}
                              onChange={(e) =>
                                setStockEdits((prev) => ({
                                  ...prev,
                                  [p.id]: { ...prev[p.id], price1: e.target.value },
                                }))
                              }
                            />
                          </td>
                          <td>
                            <input
                              className="crm-inline-input"
                              type="number"
                              placeholder="+0"
                              value={edit.addStock ?? ""}
                              onChange={(e) =>
                                setStockEdits((prev) => ({
                                  ...prev,
                                  [p.id]: { ...prev[p.id], addStock: e.target.value },
                                }))
                              }
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={savingId === p.id}
                              onClick={() => saveProduct(p)}
                            >
                              Kaydet
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {!workspace?.products?.length && (
                      <tr>
                        <td colSpan={6} className="erp-table__empty">
                          Bu şubede ürün yok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === "cash" && (
            <section className="erp-panel erp-panel--flush">
              <div className="crm-metrics crm-metrics--4">
                <article>
                  <span>Nakit</span>
                  <strong>{formatMoney(report?.cash?.total || 0)}</strong>
                  <small>{report?.cash?.count || 0} satış</small>
                </article>
                <article>
                  <span>Kredi / POS</span>
                  <strong>{formatMoney(report?.pos?.total || 0)}</strong>
                  <small>{report?.pos?.count || 0} satış</small>
                </article>
                <article>
                  <span>Açık hesap</span>
                  <strong>{formatMoney(report?.open?.total || 0)}</strong>
                  <small>{report?.open?.count || 0} satış</small>
                </article>
                <article>
                  <span>İade</span>
                  <strong>{formatMoney(report?.refund?.total || 0)}</strong>
                  <small>{report?.refund?.count || 0} fiş</small>
                </article>
              </div>
              <header className="erp-panel__head" style={{ padding: "0 12px" }}>
                <h3>Son satışlar</h3>
              </header>
              <div className="admin-table-wrap">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Fiş</th>
                      <th>Ödeme</th>
                      <th>Personel</th>
                      <th>Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(workspace?.sales || []).map((s) => (
                      <tr key={s.id} className="crm-row-link" onClick={() => setSale(s)}>
                        <td>{formatDateTime(s.createdAt)}</td>
                        <td>
                          <strong>{s.code}</strong>
                          <small>{s.itemCount} kalem</small>
                        </td>
                        <td>{PAYMENT_LABELS[s.paymentType] || s.paymentType}</td>
                        <td>{s.staffName || "—"}</td>
                        <td>{formatMoney(s.total)}</td>
                      </tr>
                    ))}
                    {!workspace?.sales?.length && (
                      <tr>
                        <td colSpan={5} className="erp-table__empty">
                          Satış yok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === "expenses" && (
            <section className="erp-panel erp-panel--flush">
              <div className="crm-metrics crm-metrics--4">
                <article>
                  <span>Kassadan çıxan</span>
                  <strong>{formatMoney(report?.withdrawalTotal || 0)}</strong>
                  <small>{workspace?.withdrawals?.length || 0} işlem</small>
                </article>
              </div>
              <div className="admin-table-wrap">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Nəyə</th>
                      <th>Qeyd</th>
                      <th>Kim</th>
                      <th>Məbləğ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(workspace?.withdrawals || []).map((row) => (
                      <tr key={row.id}>
                        <td>{formatDateTime(row.createdAt)}</td>
                        <td>{row.reason}</td>
                        <td>{row.note || "—"}</td>
                        <td>{row.staffName || "—"}</td>
                        <td>{formatMoney(row.amount)}</td>
                      </tr>
                    ))}
                    {!workspace?.withdrawals?.length && (
                      <tr>
                        <td colSpan={5} className="erp-table__empty">
                          Kasa xərci yoxdur.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === "reports" && (
            <section className="erp-panel">
              <div className="crm-metrics crm-metrics--4">
                <article>
                  <span>Satış</span>
                  <strong>{formatMoney(report?.soldAmount || 0)}</strong>
                  <small>{report?.soldQty || 0} adet</small>
                </article>
                <article>
                  <span>Alış maliyeti</span>
                  <strong>{formatMoney(report?.costAmount || 0)}</strong>
                  <small>ürün alış</small>
                </article>
                <article>
                  <span>Kâr</span>
                  <strong>{formatMoney(report?.profit || 0)}</strong>
                  <small>satış − alış</small>
                </article>
                <article>
                  <span>İade</span>
                  <strong>{formatMoney(report?.refund?.total || 0)}</strong>
                  <small>{report?.refund?.count || 0} fiş</small>
                </article>
              </div>
              <header className="erp-panel__head">
                <h3>Geri qaytarılan / iade talepleri</h3>
              </header>
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Ürün</th>
                    <th>Sebep</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {(workspace?.refundRequests || []).map((row) => (
                    <tr key={row.id}>
                      <td>{row.date}</td>
                      <td>{row.productName || "—"}</td>
                      <td>{row.reason || "—"}</td>
                      <td>{row.status}</td>
                    </tr>
                  ))}
                  {!workspace?.refundRequests?.length && (
                    <tr>
                      <td colSpan={4} className="erp-table__empty">
                        İade talebi yok.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          )}

          {tab === "staff" && (
            <section className="erp-panel erp-panel--flush">
              <div className="admin-table-wrap">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>İsim</th>
                      <th>Telefon</th>
                      <th>Rol</th>
                      <th>İşe başlama</th>
                      <th>Maaş</th>
                      <th>Günlük satış</th>
                      <th>Aylık satış</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(workspace?.staff || []).map((person) => (
                      <tr key={person.id}>
                        <td>
                          <strong>
                            {person.name} {person.surname}
                          </strong>
                          <small>{person.active ? "Aktif" : "Pasif"}</small>
                        </td>
                        <td>{person.phone || "—"}</td>
                        <td>{person.role || "—"}</td>
                        <td>{person.startedAt ? formatDateTime(person.startedAt) : "—"}</td>
                        <td>
                          <input
                            className="crm-inline-input"
                            type="number"
                            step="0.01"
                            value={salaryEdits[person.id] ?? person.salary}
                            onChange={(e) =>
                              setSalaryEdits((prev) => ({ ...prev, [person.id]: e.target.value }))
                            }
                          />
                        </td>
                        <td>
                          {formatMoney(person.todayTotal)}
                          <small>{person.todayCount} satış</small>
                        </td>
                        <td>
                          {formatMoney(person.monthTotal)}
                          <small>{person.monthCount} satış</small>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={savingId === person.id}
                            onClick={() => saveSalary(person)}
                          >
                            Kaydet
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!workspace?.staff?.length && (
                      <tr>
                        <td colSpan={8} className="erp-table__empty">
                          Çalışan yok. Admin → Çalışanlar sayfasından ekleyin.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === "settings" && (
            <form className="erp-panel erp-form admin-branch-form" onSubmit={handleSave}>
              <p className="hint-text">
                Eski şifre hash olarak saklanır, görüntülenemez. Yeni şifre yazarsanız şube girişi değişir.
              </p>
              <div className="erp-form-grid">
                <label className="erp-field">
                  <span>Ünvan *</span>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </label>
                <label className="erp-field">
                  <span>Şube No *</span>
                  <input
                    type="number"
                    min={1}
                    max={99999}
                    value={form.branchNo}
                    onChange={(e) => setForm({ ...form, branchNo: e.target.value })}
                    required
                  />
                </label>
                <label className="erp-field">
                  <span>Giriş e-postası *</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </label>
                <label className="erp-field">
                  <span>Yeni şifre</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Boş = değişmez"
                  />
                </label>
                <label className="erp-field erp-field--full">
                  <span>Adres</span>
                  <textarea
                    rows={3}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </label>
                <div className="erp-field erp-field--full">
                  <span>İş saatları</span>
                  <div className="erp-inline-row">
                    <input
                      type="time"
                      value={form.businessOpenTime}
                      onChange={(e) => setForm({ ...form, businessOpenTime: e.target.value })}
                    />
                    <input
                      type="time"
                      value={form.businessCloseTime}
                      onChange={(e) => setForm({ ...form, businessCloseTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-warning" onClick={toggleActive}>
                  {branch.active ? "Pasifleştir" : "Aktifleştir"}
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDelete}>
                  Şubeyi Sil
                </button>
                <button type="submit" className="btn btn-primary">
                  Kaydet
                </button>
              </div>
            </form>
          )}
        </>
      )}

      <Modal open={!!sale} title={sale ? `Fiş ${sale.code}` : ""} onClose={() => setSale(null)}>
        {sale && (
          <>
            <p className="hint-text">
              {formatDateTime(sale.createdAt)} · {PAYMENT_LABELS[sale.paymentType] || sale.paymentType} ·{" "}
              {sale.staffName || "—"}
            </p>
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Ürün</th>
                  <th>Adet</th>
                  <th>Fiyat</th>
                  <th>Tutar</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.qty}</td>
                    <td>{formatMoney(item.price)}</td>
                    <td>{formatMoney(item.qty * item.price - (item.discount || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              <strong>Toplam {formatMoney(sale.total)}</strong>
            </p>
          </>
        )}
      </Modal>
    </div>
  );
}
