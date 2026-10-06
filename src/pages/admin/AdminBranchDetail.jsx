import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { getBranchLabel } from "../../utils/branchDisplay";
import { formatDateTime, formatMoney } from "../../utils/format";
import { formatStockLabel, isGramUnit, formatGrams } from "../../utils/grams";
import { adminListPath, isProductionKind } from "../../utils/adminPaths";
import Modal from "../../components/ui/Modal";

const PAYMENT_LABELS = {
  cash: "Nakit",
  pos: "Kredi / POS",
  open: "Açık hesap",
  partial: "Hissəli",
  other: "Diğer",
  refund: "İade",
};

function salePaymentLabel(sale) {
  if (sale?.paymentType === "other") return sale.paymentMethodName || "Diğer";
  return PAYMENT_LABELS[sale?.paymentType] || sale?.paymentType || "—";
}

const TABS = [
  { id: "stock", label: "Anbar" },
  { id: "sold", label: "Satılmış ürünler" },
  { id: "cash", label: "Kasa" },
  { id: "expenses", label: "Xərclər" },
  { id: "reports", label: "Hesabat" },
  { id: "staff", label: "Çalışanlar" },
  { id: "settings", label: "Ayarlar" },
];

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminBranchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { enterBranchAsAdmin, enterStaffAsAdmin } = useAuth();

  const [tab, setTab] = useState("stock");
  const [workspaceDate, setWorkspaceDate] = useState(todayISO);
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
  const [enteringStaffId, setEnteringStaffId] = useState("");
  const [savingId, setSavingId] = useState("");
  const [passwordEdits, setPasswordEdits] = useState({});
  const [copiedLogin, setCopiedLogin] = useState("");
  const [expenseEdit, setExpenseEdit] = useState(null);
  const [expenseForm, setExpenseForm] = useState({ amount: "", reason: "", note: "" });
  const [expenseSaving, setExpenseSaving] = useState(false);

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

  const loadWorkspace = async (date = workspaceDate) => {
    const data = await api.getAdminBranchWorkspace(id, { date });
    setWorkspace(data);
    if (data?.date) setWorkspaceDate(data.date);
    setStockEdits({});
    setSalaryEdits({});
    setPasswordEdits({});
  };

  useEffect(() => {
    Promise.all([loadBranch(), loadWorkspace(workspaceDate)]).catch((e) => setError(e.message));
  }, [id]);

  const applyDateFilter = async (nextDate) => {
    setWorkspaceDate(nextDate);
    setError("");
    try {
      await loadWorkspace(nextDate);
    } catch (e) {
      setError(e.message);
    }
  };

  const openExpenseEdit = (row) => {
    setExpenseEdit(row);
    setExpenseForm({
      amount: String(row.amount ?? ""),
      reason: row.reason || "",
      note: row.note || "",
    });
    setError("");
  };

  const handleExpenseSave = async (e) => {
    e.preventDefault();
    if (!expenseEdit) return;
    setError("");
    setMessage("");
    const amount = Number(expenseForm.amount);
    if (!amount || amount <= 0) {
      setError("Geçerli məbləğ girin");
      return;
    }
    if (!expenseForm.reason.trim()) {
      setError("Xərc səbəbi zəruridir");
      return;
    }
    setExpenseSaving(true);
    try {
      await api.updateAdminCashWithdrawal(expenseEdit.id, {
        amount,
        reason: expenseForm.reason.trim(),
        note: expenseForm.note.trim(),
      });
      setExpenseEdit(null);
      setMessage("Xərc düzəldildi.");
      await loadWorkspace();
    } catch (err) {
      setError(err.message);
    } finally {
      setExpenseSaving(false);
    }
  };

  const handleExpenseDelete = async (row) => {
    const ok = window.confirm(`Bu xərci silmək istəyirsiniz?\n${row.reason} — ${formatMoney(row.amount)}`);
    if (!ok) return;
    setError("");
    setMessage("");
    try {
      await api.deleteAdminCashWithdrawal(row.id);
      if (expenseEdit?.id === row.id) setExpenseEdit(null);
      setMessage("Xərc silindi.");
      await loadWorkspace();
    } catch (err) {
      setError(err.message);
    }
  };

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
      const account = await enterBranchAsAdmin(id);
      const production = account?.branchKind === "production" || branch?.kind === "production";
      navigate(production ? "/istehsalat/xammaddeler" : "/sales");
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
      navigate(adminListPath(isProductionKind(branch) ? "production" : "sales"), {
        state: { message: isProductionKind(branch) ? "İstehsalat silindi." : "Şube silindi." },
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`"${product.name}" bu şubeden silinsin?`)) return;
    setSavingId(product.id);
    setError("");
    try {
      await api.deleteAdminBranchProduct(id, product.id);
      await loadWorkspace();
      setMessage(`${product.name} silindi.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId("");
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
    const salaryValue = salaryEdits[person.id];
    const passwordValue = passwordEdits[person.id];
    const patch = {};
    if (salaryValue != null && salaryValue !== "") patch.salary = Number(salaryValue);
    if (passwordValue?.trim()) patch.password = passwordValue.trim();
    if (!Object.keys(patch).length) return;
    setSavingId(person.id);
    setError("");
    try {
      await api.updateAdminBranchStaff(id, person.id, patch);
      await loadWorkspace();
      setPasswordEdits((prev) => ({ ...prev, [person.id]: "" }));
      setMessage(
        patch.password ? "Çalışan bilgileri güncellendi. Yeni parola kaydedildi." : "Maaş güncellendi."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId("");
    }
  };

  const copyStaffLogin = async (login) => {
    if (!login) return;
    try {
      await navigator.clipboard.writeText(login);
      setCopiedLogin(login);
      setMessage(`Login kopyalandı: ${login}`);
    } catch {
      setError("Login kopyalanamadı.");
    }
  };

  const handleEnterStaff = async (person) => {
    setEnteringStaffId(person.id);
    setError("");
    try {
      sessionStorage.setItem("ugurpos_admin_last_branch", id);
      await enterStaffAsAdmin(person.id);
      navigate("/sales");
    } catch (err) {
      setError(err.message);
    } finally {
      setEnteringStaffId("");
    }
  };

  if (!branch && !error) return <div className="erp-panel">Yükleniyor...</div>;

  const label = branch ? getBranchLabel(branch) : "Hesap";
  const report = workspace?.report;
  const soldProducts = workspace?.soldProducts || [];
  const isProduction = branch?.kind === "production";
  const visibleTabs = isProduction ? [{ id: "settings", label: "Ayarlar" }] : TABS;
  const currentTab = isProduction ? "settings" : tab;
  const showDateFilter = ["sold", "cash", "expenses", "reports"].includes(currentTab);

  const dateFilterBar = showDateFilter ? (
    <div className="erp-panel erp-filters admin-branch-date-filter">
      <label>
        Gün
        <input
          type="date"
          value={workspaceDate}
          onChange={(e) => applyDateFilter(e.target.value || todayISO())}
        />
      </label>
      <button type="button" className="btn btn-default btn-sm" onClick={() => applyDateFilter(todayISO())}>
        Bu gün
      </button>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => applyDateFilter(workspaceDate)}>
        Filtrele
      </button>
    </div>
  ) : null;

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
                  <p className="crm-object">{isProduction ? "Hesap · İstehsalat" : "Hesap · Şube"}</p>
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
                <Link to={adminListPath(isProduction ? "production" : "sales")} className="btn btn-default btn-sm">
                  Liste
                </Link>
                {branch.active && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleEnterPos} disabled={entering}>
                    {entering ? "..." : isProduction ? "İstehsalata geç" : "Şubeye geç"}
                  </button>
                )}
              </div>
            </div>
            {!isProduction && (
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
            )}
          </section>

          <ul className="admin-tabs erp-tabs">
            {visibleTabs.map((item) => (
              <li key={item.id}>
                <button type="button" className={currentTab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          {dateFilterBar}

          {currentTab === "stock" && (
            <section className="erp-panel erp-panel--flush">
              {(workspace?.productionGrams || []).length > 0 && (
                <div className="admin-table-wrap">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>İstehsalattan gelen</th>
                        <th>Gönderilen</th>
                        <th>Kalan</th>
                        <th>Satışta çıkan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workspace.productionGrams.map((row) => (
                        <tr key={row.name}>
                          <td data-label="İstehsalattan gelen">
                            <strong>{row.name}</strong>
                          </td>
                          <td data-label="Gönderilen">{formatGrams(row.sentGrams)}</td>
                          <td data-label="Kalan">{formatGrams(row.remainingGrams)}</td>
                          <td data-label="Satışta çıkan">{formatGrams(row.usedGrams)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
                          <td data-label="Ürün">
                            <strong>
                              {isGramUnit(p.unit) ? (
                                <>
                                  <em>{formatGrams(p.stock)} </em>
                                  {p.name}
                                </>
                              ) : (
                                p.name
                              )}
                            </strong>
                            {p.stock <= p.criticalStock && <small>kritik stok</small>}
                          </td>
                          <td data-label="Grup">{p.groupName || "—"}</td>
                          <td data-label="Stokta kalan">{formatStockLabel(p.stock, p.unit)}</td>
                          <td data-label="Fiyat">
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
                          <td data-label="Stok ekle">
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
                          <td data-label="">
                            <div className="admin-row-actions">
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled={savingId === p.id}
                                onClick={() => saveProduct(p)}
                              >
                                Kaydet
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                disabled={savingId === p.id}
                                onClick={() => deleteProduct(p)}
                              >
                                Sil
                              </button>
                            </div>
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

          {currentTab === "sold" && (
            <section className="erp-panel erp-panel--flush">
              <div className="crm-metrics crm-metrics--4">
                <article>
                  <span>Satılan məhsul</span>
                  <strong>{soldProducts.length}</strong>
                  <small>{workspaceDate}</small>
                </article>
                <article>
                  <span>Ümumi miqdar</span>
                  <strong>{report?.soldQty || 0}</strong>
                  <small>qram / ədəd</small>
                </article>
                <article>
                  <span>Satış məbləği</span>
                  <strong>{formatMoney(report?.soldAmount || 0)}</strong>
                  <small>günlük</small>
                </article>
              </div>
              <div className="admin-table-wrap">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Ürün</th>
                      <th>Miqdar</th>
                      <th>Məbləğ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soldProducts.map((row) => (
                      <tr key={`${row.productId}-${row.name}`}>
                        <td data-label="Ürün">
                          <strong>
                            {isGramUnit(row.unit) ? (
                              <>
                                <em>{formatGrams(row.qty)} </em>
                                {row.name}
                              </>
                            ) : (
                              row.name
                            )}
                          </strong>
                        </td>
                        <td data-label="Miqdar">{formatStockLabel(row.qty, row.unit)}</td>
                        <td data-label="Məbləğ">{formatMoney(row.amount)}</td>
                      </tr>
                    ))}
                    {!soldProducts.length && (
                      <tr>
                        <td colSpan={3} className="erp-table__empty">
                          Seçilmiş gündə satılmış ürün yoxdur.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {currentTab === "cash" && (
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
                  <span>Hissəli</span>
                  <strong>{formatMoney(report?.partial?.total || 0)}</strong>
                  <small>{report?.partial?.count || 0} satış</small>
                </article>
                <article>
                  <span>Açık hesap</span>
                  <strong>{formatMoney(report?.open?.total || 0)}</strong>
                  <small>{report?.open?.count || 0} satış</small>
                </article>
                {(report?.methods || []).map((method) => (
                  <article key={method.id || method.name}>
                    <span>{method.name}</span>
                    <strong>{formatMoney(method.total || 0)}</strong>
                    <small>{method.count || 0} satış</small>
                  </article>
                ))}
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
                        <td data-label="Tarih">{formatDateTime(s.createdAt)}</td>
                        <td data-label="Fiş">
                          <strong>{s.code}</strong>
                          <small>{s.itemCount} kalem</small>
                        </td>
                        <td data-label="Ödeme">{salePaymentLabel(s)}</td>
                        <td data-label="Personel">{s.staffName || "—"}</td>
                        <td data-label="Tutar">{formatMoney(s.total)}</td>
                      </tr>
                    ))}
                    {!workspace?.sales?.length && (
                      <tr>
                        <td colSpan={5} className="erp-table__empty">
                          Seçilmiş gündə satış yoxdur.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {currentTab === "expenses" && (
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
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(workspace?.withdrawals || []).map((row) => (
                      <tr key={row.id}>
                        <td data-label="Tarih">{formatDateTime(row.createdAt)}</td>
                        <td data-label="Nəyə">{row.reason}</td>
                        <td data-label="Qeyd">{row.note || "—"}</td>
                        <td data-label="Kim">{row.staffName || "—"}</td>
                        <td data-label="Məbləğ">{formatMoney(row.amount)}</td>
                        <td data-label="">
                          <div className="staff-row-actions">
                            <button type="button" className="btn btn-default btn-sm" onClick={() => openExpenseEdit(row)}>
                              Düzəlt
                            </button>
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => handleExpenseDelete(row)}>
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!workspace?.withdrawals?.length && (
                      <tr>
                        <td colSpan={6} className="erp-table__empty">
                          Seçilmiş gündə kasa xərci yoxdur.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {currentTab === "reports" && (
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
                <h3>Ödeme yöntemleri</h3>
              </header>
              <div className="crm-metrics crm-metrics--4">
                <article>
                  <span>Nakit</span>
                  <strong>{formatMoney(report?.cash?.total || 0)}</strong>
                  <small>{report?.cash?.count || 0} satış</small>
                </article>
                <article>
                  <span>POS</span>
                  <strong>{formatMoney(report?.pos?.total || 0)}</strong>
                  <small>{report?.pos?.count || 0} satış</small>
                </article>
                <article>
                  <span>Hissəli</span>
                  <strong>{formatMoney(report?.partial?.total || 0)}</strong>
                  <small>{report?.partial?.count || 0} satış</small>
                </article>
                {(report?.methods || []).map((method) => (
                  <article key={`rep-${method.id || method.name}`}>
                    <span>{method.name}</span>
                    <strong>{formatMoney(method.total || 0)}</strong>
                    <small>{method.count || 0} satış</small>
                  </article>
                ))}
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
                      <td data-label="Tarih">{row.date}</td>
                      <td data-label="Ürün">{row.productName || "—"}</td>
                      <td data-label="Sebep">{row.reason || "—"}</td>
                      <td data-label="Durum">{row.status}</td>
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

          {currentTab === "staff" && (
            <section className="erp-panel erp-panel--flush">
              <p className="hint-text admin-staff-hint">
                Giriş bilgisi olarak login adı gösterilir. Eski parola hash olarak saklanır, görüntülenemez.
                Yeni parola yazıp kaydederseniz çalışan girişi değişir.
              </p>
              <div className="admin-table-wrap">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>İsim</th>
                      <th>Login</th>
                      <th>Telefon</th>
                      <th>Rol</th>
                      <th>İşe başlama</th>
                      <th>Maaş</th>
                      <th>Günlük satış</th>
                      <th>Aylık satış</th>
                      <th>Yeni parola</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(workspace?.staff || []).map((person) => (
                      <tr key={person.id}>
                        <td data-label="İsim">
                          <strong>
                            {person.name} {person.surname}
                          </strong>
                          <small>{person.active ? "Aktif" : "Pasif"}</small>
                        </td>
                        <td data-label="Login">
                          <div className="staff-login-cell">
                            <code>{person.login || "—"}</code>
                            {person.login ? (
                              <button
                                type="button"
                                className="btn btn-default btn-sm"
                                onClick={() => copyStaffLogin(person.login)}
                              >
                                {copiedLogin === person.login ? "Kopyalandı" : "Kopyala"}
                              </button>
                            ) : null}
                          </div>
                          {!person.hasPassword && (
                            <small className="staff-password-warn">Parola yok — giriş yapamaz, yeni parola kaydedin.</small>
                          )}
                        </td>
                        <td data-label="Telefon">{person.phone || "—"}</td>
                        <td data-label="Rol">{person.role || "—"}</td>
                        <td data-label="İşe başlama">{person.startedAt ? formatDateTime(person.startedAt) : "—"}</td>
                        <td data-label="Maaş">
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
                        <td data-label="Günlük satış">
                          {formatMoney(person.todayTotal)}
                          <small>{person.todayCount} satış</small>
                        </td>
                        <td data-label="Aylık satış">
                          {formatMoney(person.monthTotal)}
                          <small>{person.monthCount} satış</small>
                        </td>
                        <td data-label="Yeni parola">
                          <input
                            className="crm-inline-input staff-password-input"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Yeni parola"
                            value={passwordEdits[person.id] ?? ""}
                            onChange={(e) =>
                              setPasswordEdits((prev) => ({ ...prev, [person.id]: e.target.value }))
                            }
                          />
                        </td>
                        <td data-label="">
                          <div className="staff-row-actions">
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={savingId === person.id}
                              onClick={() => saveSalary(person)}
                            >
                              Kaydet
                            </button>
                            <button
                              type="button"
                              className="btn btn-default btn-sm"
                              disabled={enteringStaffId === person.id || !branch.active}
                              onClick={() => handleEnterStaff(person)}
                            >
                              {enteringStaffId === person.id ? "..." : "Çalışan hesabına geç"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!workspace?.staff?.length && (
                      <tr>
                        <td colSpan={10} className="erp-table__empty">
                          Çalışan yok. Admin → Çalışanlar sayfasından ekleyin.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {currentTab === "settings" && (
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
              {formatDateTime(sale.createdAt)} · {salePaymentLabel(sale)} ·{" "}
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
                    <td data-label="Ürün">{item.name}</td>
                    <td data-label="Adet">{item.qty}</td>
                    <td data-label="Fiyat">{formatMoney(item.price)}</td>
                    <td data-label="Tutar">{formatMoney(item.qty * item.price - (item.discount || 0))}</td>
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

      <Modal open={!!expenseEdit} title="Xərci düzəlt" onClose={() => !expenseSaving && setExpenseEdit(null)}>
        <form className="erp-form" onSubmit={handleExpenseSave}>
          <div className="erp-form-grid">
            <label className="erp-field">
              <span>Məbləğ *</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                required
              />
            </label>
            <label className="erp-field">
              <span>Səbəb *</span>
              <input
                value={expenseForm.reason}
                onChange={(e) => setExpenseForm({ ...expenseForm, reason: e.target.value })}
                required
              />
            </label>
            <label className="erp-field erp-field--full">
              <span>Qeyd</span>
              <input
                value={expenseForm.note}
                onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })}
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-default" disabled={expenseSaving} onClick={() => setExpenseEdit(null)}>
              Ləğv
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={expenseSaving}
              onClick={() => expenseEdit && handleExpenseDelete(expenseEdit)}
            >
              Sil
            </button>
            <button type="submit" className="btn btn-success" disabled={expenseSaving}>
              {expenseSaving ? "Saxlanır…" : "Yadda saxla"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
