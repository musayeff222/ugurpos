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
    <div className="admin-page">
      <PageHeader
        title="Şubeler"
        subtitle={`${branches.length} kayıt`}
        actions={
          <Link to="/admin/branches/new" className="btn btn-success btn-sm admin-hide-mobile">
            + Yeni Şube
          </Link>
        }
      />
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="admin-branch-grid">
        {branches.map((b) => (
          <Link
            key={b.id}
            to={`/admin/branches/${b.id}`}
            className={`admin-branch-card admin-branch-card--link ${b.active ? "" : "inactive"}`}
          >
            <div className="admin-branch-card__head">
              <div>
                <h3>
                  #{b.branchNo} {b.name}
                </h3>
                <span className="admin-branch-email">{b.email}</span>
              </div>
              <span className={`admin-badge ${b.active ? "ok" : "off"}`}>{b.active ? "Aktif" : "Pasif"}</span>
            </div>
            <div className="admin-branch-card__stats admin-branch-card__stats--2">
              <div>
                <span>Bugün</span>
                <strong>{formatMoney(b.stats?.todayTotal || 0)}</strong>
              </div>
              <div>
                <span>Ürün</span>
                <strong>{b.stats?.productCount || 0}</strong>
              </div>
            </div>
          </Link>
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
