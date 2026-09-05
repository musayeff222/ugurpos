import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { getBranchLabel } from "../../utils/branchDisplay";
import { formatMoney } from "../../utils/format";

const PAYMENT_LABELS = {
  cash: "Nakit",
  pos: "POS",
  open: "Açık Hesap",
  partial: "Parçalı",
  refund: "İade",
};

export default function AdminBranchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { enterBranchAsAdmin } = useAuth();

  const [tab, setTab] = useState("edit");
  const [branch, setBranch] = useState(null);
  const [activity, setActivity] = useState(null);
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
  const [message, setMessage] = useState(location.state?.message || "");
  const [error, setError] = useState("");
  const [entering, setEntering] = useState(false);

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

  const loadActivity = async () => {
    const data = await api.getAdminBranchActivity(id);
    setActivity(data);
  };

  useEffect(() => {
    loadBranch().catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (tab === "activity") loadActivity().catch((e) => setError(e.message));
  }, [tab, id]);

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
      setMessage("Şube bilgileri güncellendi.");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEnterPos = async () => {
    setEntering(true);
    setError("");
    try {
      await enterBranchAsAdmin(id);
      navigate("/dashboard");
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
    const label = getBranchLabel(branch);
    if (!window.confirm(`"${label}" şubesini silmek istediğinize emin misiniz? Web sitesinden kaldırılır.`)) return;
    setMessage("");
    setError("");
    try {
      await api.deleteBranch(id);
      navigate("/admin/branches", { state: { message: "Şube silindi." } });
    } catch (err) {
      setError(err.message);
    }
  };

  if (!branch && !error) return <div className="erp-panel">Yükleniyor...</div>;

  const label = branch ? getBranchLabel(branch) : "Hesap";

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
                    {entering ? "..." : "POS oturumu"}
                  </button>
                )}
              </div>
            </div>
            <dl className="crm-highlights">
              <div>
                <dt>Bugünkü ciro</dt>
                <dd>{formatMoney(branch.stats?.todayTotal || 0)}</dd>
                <small>{branch.stats?.todayCount || 0} satış</small>
              </div>
              <div>
                <dt>Aylık ciro</dt>
                <dd>{formatMoney(branch.stats?.monthTotal || 0)}</dd>
                <small>{branch.stats?.monthCount || 0} satış</small>
              </div>
              <div>
                <dt>Ürün</dt>
                <dd>{branch.stats?.productCount || 0}</dd>
                <small>katalog</small>
              </div>
              <div>
                <dt>Müşteri</dt>
                <dd>{branch.stats?.customerCount || 0}</dd>
                <small>CRM</small>
              </div>
            </dl>
          </section>

          <ul className="admin-tabs erp-tabs">
            <li>
              <button type="button" className={tab === "edit" ? "active" : ""} onClick={() => setTab("edit")}>
                Ayrıntılar
              </button>
            </li>
            <li>
              <button type="button" className={tab === "activity" ? "active" : ""} onClick={() => setTab("activity")}>
                İlgili satışlar
              </button>
            </li>
          </ul>

          {tab === "edit" && (
            <form className="erp-panel erp-form admin-branch-form" onSubmit={handleSave}>
              <div className="erp-form-grid">
                <label className="erp-field">
                  <span>Ünvan (şube adı) *</span>
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
                  <small>Dahili numara. Web sitesinde müşteriye gösterilmez.</small>
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
                    placeholder="Küçə, bina, mərtəbə..."
                  />
                </label>
                <div className="erp-field erp-field--full">
                  <span>Konum (harita / yakın şube)</span>
                  <div className="erp-inline-row">
                    <input
                      placeholder="Lat"
                      value={form.lat}
                      onChange={(e) => setForm({ ...form, lat: e.target.value })}
                    />
                    <input
                      placeholder="Lng"
                      value={form.lng}
                      onChange={(e) => setForm({ ...form, lng: e.target.value })}
                    />
                    <button
                      type="button"
                      className="btn btn-default btn-sm"
                      onClick={() => {
                        if (!navigator.geolocation) return;
                        navigator.geolocation.getCurrentPosition((pos) => {
                          setForm((prev) => ({
                            ...prev,
                            lat: String(pos.coords.latitude),
                            lng: String(pos.coords.longitude),
                          }));
                        });
                      }}
                    >
                      Konumumu al
                    </button>
                  </div>
                  <small>Web siparişte en yakın şube seçimi için kullanılır.</small>
                </div>
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
                  <small>Günlük satış və hesabatlar bu saat aralığında hesablanır (məs: 08:00–17:00).</small>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-warning" onClick={toggleActive}>
                  {branch.active ? "Pasifleştir" : "Aktifleştir"}
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDelete}>
                  Şubeyi Sil
                </button>
                <button type="submit" className="btn btn-success">
                  Kaydet
                </button>
              </div>
            </form>
          )}

          {tab === "activity" && (
            <section className="erp-panel">
              <header className="erp-panel__head">
                <h3>Son satışlar</h3>
              </header>
              {!activity ? (
                <p className="admin-empty-inline">Yükleniyor...</p>
              ) : activity.sales.length === 0 ? (
                <p className="admin-empty-inline">Henüz satış yok.</p>
              ) : (
                <>
                  <div className="admin-mobile-list">
                    {activity.sales.map((s) => (
                      <div key={s.id} className="admin-mobile-list__item">
                        <div className="admin-mobile-list__head">
                          <strong>{s.code}</strong>
                          <span>{formatMoney(s.total)}</span>
                        </div>
                        <p>
                          {new Date(s.createdAt).toLocaleString("tr-TR")} ·{" "}
                          {PAYMENT_LABELS[s.paymentType] || s.paymentType} · {s.itemCount} kalem
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="admin-table-wrap admin-table-wrap--desktop-only">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>Tarih</th>
                          <th>Fiş</th>
                          <th>Ödeme</th>
                          <th>Kalem</th>
                          <th>Tutar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activity.sales.map((s) => (
                          <tr key={s.id}>
                            <td>{new Date(s.createdAt).toLocaleString("tr-TR")}</td>
                            <td>{s.code}</td>
                            <td>{PAYMENT_LABELS[s.paymentType] || s.paymentType}</td>
                            <td>{s.itemCount}</td>
                            <td>{formatMoney(s.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
