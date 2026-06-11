import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import PageHeader from "../../components/ui/PageHeader";
import { getBranchLabel } from "../../utils/branchDisplay";

const TYPE_LABELS = {
  branch_login: "Şube girişi",
  admin_login: "Admin girişi",
  qr_order: "Web siparişi",
};

const TYPE_CLASS = {
  branch_login: "ok",
  admin_login: "pending",
  qr_order: "pending",
};

export default function AdminActivity() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await api.getAdminActivity());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(() => load().catch(() => {}), 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="admin-page">
      <PageHeader
        title="Şube hareketleri"
        subtitle="Girişler ve web sipariş bildirimleri"
        actions={
          <button type="button" className="btn btn-default btn-sm" onClick={load}>
            Yenile
          </button>
        }
      />

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        {loading && items.length === 0 ? (
          <p className="admin-empty-inline">Yükleniyor…</p>
        ) : items.length === 0 ? (
          <p className="admin-empty-inline">Henüz kayıt yok. Şube girişleri ve web siparişler burada görünür.</p>
        ) : (
          <div className="admin-activity-feed">
            {items.map((item) => (
              <div key={item.id} className={`admin-activity-feed__item admin-activity-feed__item--${item.type}`}>
                <div className="admin-activity-feed__head">
                  <span className={`admin-badge ${TYPE_CLASS[item.type] || ""}`}>
                    {TYPE_LABELS[item.type] || item.type}
                  </span>
                  <time>{new Date(item.createdAt).toLocaleString("tr-TR")}</time>
                </div>
                <strong>{item.title}</strong>
                {item.branchName && (
                  <p className="admin-activity-feed__branch">{getBranchLabel({ name: item.branchName })}</p>
                )}
                {item.detail && <p className="hint-text">{item.detail}</p>}
                {item.type === "qr_order" && (
                  <Link to="/admin/qr-menu" className="admin-activity-feed__link">
                    Siparişlere git →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
