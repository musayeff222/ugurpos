import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import PageHeader from "../../components/ui/PageHeader";
import { formatMoney } from "../../utils/format";

export default function AdminBranches() {
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getAdminBranches()
      .then(setBranches)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <PageHeader
        title="Şubeler"
        actions={
          <Link to="/admin/branches/new" className="btn btn-success">
            <i className="fa fa-plus" /> Yeni Şube Oluştur
          </Link>
        }
      />
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="admin-branch-grid">
        {branches.map((b) => (
          <div key={b.id} className={`admin-branch-card ${b.active ? "" : "inactive"}`}>
            <div className="admin-branch-card__head">
              <div>
                <h3>
                  #{b.branchNo} {b.name}
                </h3>
                <span className="admin-branch-email">{b.email}</span>
              </div>
              <span className={`admin-badge ${b.active ? "ok" : "off"}`}>{b.active ? "Aktif" : "Pasif"}</span>
            </div>
            <div className="admin-branch-card__stats">
              <div>
                <span>Bugün satış</span>
                <strong>{formatMoney(b.stats?.todayTotal || 0)}</strong>
              </div>
              <div>
                <span>Ürün</span>
                <strong>{b.stats?.productCount || 0}</strong>
              </div>
              <div>
                <span>Toplam satış</span>
                <strong>{b.stats?.saleCount || 0}</strong>
              </div>
            </div>
            <div className="admin-branch-card__actions">
              <Link to={`/admin/branches/${b.id}`} className="btn btn-primary btn-sm">
                Yönet
              </Link>
            </div>
          </div>
        ))}
        {branches.length === 0 && (
          <div className="card admin-empty">
            <p>Henüz şube yok.</p>
            <Link to="/admin/branches/new" className="btn btn-success">
              İlk şubeyi oluştur
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
