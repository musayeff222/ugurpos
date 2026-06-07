import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import PageHeader from "../../components/ui/PageHeader";
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
  const [form, setForm] = useState({ name: "", email: "", password: "", address: "" });
  const [message, setMessage] = useState(location.state?.message || "");
  const [error, setError] = useState("");
  const [entering, setEntering] = useState(false);

  const loadBranch = async () => {
    const data = await api.getAdminBranch(id);
    setBranch(data);
    setForm({
      name: data.name,
      email: data.email || "",
      password: "",
      address: data.address || "",
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

  if (!branch && !error) return <div className="card">Yükleniyor...</div>;

  return (
    <div className="admin-page">
      <PageHeader
        title={branch ? `#${branch.branchNo} ${branch.name}` : "Şube"}
        actions={
          <>
            <Link to="/admin/branches" className="btn btn-default btn-sm">
              ← Geri
            </Link>
            {branch?.active && (
              <button type="button" className="btn btn-primary btn-sm" onClick={handleEnterPos} disabled={entering}>
                {entering ? "..." : "POS'a Gir"}
              </button>
            )}
          </>
        }
      />

      {message && <div className="alert alert-info">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {branch && (
        <>
          <div className="admin-stats admin-stats--compact">
            <div className="admin-stat-card">
              <span>Bugün</span>
              <strong>{formatMoney(branch.stats?.todayTotal || 0)}</strong>
              <small>{branch.stats?.todayCount || 0} satış</small>
            </div>
            <div className="admin-stat-card">
              <span>Bu ay</span>
              <strong>{formatMoney(branch.stats?.monthTotal || 0)}</strong>
              <small>{branch.stats?.monthCount || 0} satış</small>
            </div>
            <div className="admin-stat-card">
              <span>Ürün</span>
              <strong>{branch.stats?.productCount || 0}</strong>
            </div>
          </div>

          <div className="admin-info-strip">
            <span>
              <strong>E-posta:</strong> {branch.email || "—"}
            </span>
          </div>

          <ul className="admin-tabs">
            <li>
              <button type="button" className={tab === "edit" ? "active" : ""} onClick={() => setTab("edit")}>
                Bilgiler
              </button>
            </li>
            <li>
              <button type="button" className={tab === "activity" ? "active" : ""} onClick={() => setTab("activity")}>
                Hareketler
              </button>
            </li>
          </ul>

          {tab === "edit" && (
            <form className="card form-grid admin-branch-form" onSubmit={handleSave}>
              <label>Şube Adı *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

              <label>Şube No</label>
              <input value={`#${branch.branchNo || "—"}`} disabled readOnly />

              <label>Giriş E-postası *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />

              <label>Yeni Şifre (boş = değişmez)</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />

              <label>Adres</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />

              <div className="form-actions">
                <button type="button" className="btn btn-warning" onClick={toggleActive}>
                  {branch.active ? "Pasifleştir" : "Aktifleştir"}
                </button>
                <button type="submit" className="btn btn-success">
                  Kaydet
                </button>
              </div>
            </form>
          )}

          {tab === "activity" && (
            <div className="admin-activity">
              {!activity ? (
                <div className="card">Yükleniyor...</div>
              ) : (
                <>
                  <div className="card">
                    <h3>Son Satışlar</h3>
                    {activity.sales.length === 0 ? (
                      <p className="admin-empty-inline">Henüz satış yok.</p>
                    ) : (
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
                    )}
                    <div className="admin-table-wrap admin-table-wrap--desktop-only">
                      <table className="data-table">
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
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
