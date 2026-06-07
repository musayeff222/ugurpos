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
    <div>
      <PageHeader
        title={branch ? `#${branch.branchNo} — ${branch.name}` : "Şube"}
        actions={
          <>
            <Link to="/admin/branches" className="btn btn-default">
              ← Listeye dön
            </Link>
            {branch?.active && (
              <button type="button" className="btn btn-primary" onClick={handleEnterPos} disabled={entering}>
                <i className="fa fa-sign-in" /> {entering ? "Açılıyor..." : "POS'a Gir"}
              </button>
            )}
          </>
        }
      />

      {message && <div className="alert alert-info">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {branch && (
        <>
          <div className="admin-stats">
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
              <span>Ürün / Müşteri</span>
              <strong>
                {branch.stats?.productCount || 0} / {branch.stats?.customerCount || 0}
              </strong>
            </div>
            <div className="admin-stat-card">
              <span>Şube No</span>
              <strong>#{branch.branchNo || "—"}</strong>
            </div>
            <div className="admin-stat-card">
              <span>Giriş E-postası</span>
              <strong>{branch.email || "—"}</strong>
            </div>
          </div>

          <ul className="admin-tabs">
            <li>
              <button type="button" className={tab === "edit" ? "active" : ""} onClick={() => setTab("edit")}>
                Düzenle
              </button>
            </li>
            <li>
              <button type="button" className={tab === "activity" ? "active" : ""} onClick={() => setTab("activity")}>
                Şube Hareketleri
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
                <div className="card">Hareketler yükleniyor...</div>
              ) : (
                <>
                  <div className="card">
                    <h3>Son Satışlar</h3>
                    <div className="admin-table-wrap">
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
                        {activity.sales.length === 0 ? (
                          <tr>
                            <td colSpan={5}>Henüz satış yok.</td>
                          </tr>
                        ) : (
                          activity.sales.map((s) => (
                            <tr key={s.id}>
                              <td>{new Date(s.createdAt).toLocaleString("tr-TR")}</td>
                              <td>{s.code}</td>
                              <td>{PAYMENT_LABELS[s.paymentType] || s.paymentType}</td>
                              <td>{s.itemCount}</td>
                              <td>{formatMoney(s.total)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    </div>
                  </div>

                  <div className="card">
                    <h3>Stok Sayımları</h3>
                    <div className="admin-table-wrap">
                      <table className="data-table">
                      <thead>
                        <tr>
                          <th>Tarih</th>
                          <th>Ürün</th>
                          <th>Önceki</th>
                          <th>Sayılan</th>
                          <th>Fark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activity.stockCounts.length === 0 ? (
                          <tr>
                            <td colSpan={5}>Stok sayımı yok.</td>
                          </tr>
                        ) : (
                          activity.stockCounts.map((sc) => (
                            <tr key={sc.id}>
                              <td>{sc.date}</td>
                              <td>{sc.productName}</td>
                              <td>{sc.previous}</td>
                              <td>{sc.counted}</td>
                              <td>{sc.difference}</td>
                            </tr>
                          ))
                        )}
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
