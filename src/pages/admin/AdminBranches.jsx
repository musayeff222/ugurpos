import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import PageHeader from "../../components/ui/PageHeader";
import { formatMoney } from "../../utils/format";
import { getBranchLabel } from "../../utils/branchDisplay";

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
    <div className="admin-page erp-page">
      <PageHeader
        title="Şube CRM"
        subtitle={`${branches.length} şube · stok, satış ve kasa tek yerde`}
        actions={
          <Link to="/admin/branches/new" className="btn btn-success btn-sm">
            + Yeni Şube
          </Link>
        }
      />
      {error && <div className="alert alert-danger">{error}</div>}

      <section className="erp-panel">
        <div className="admin-table-wrap admin-table-wrap--desktop-only">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Şube</th>
                <th>Durum</th>
                <th>Bugünkü ciro</th>
                <th>Ürün</th>
                <th>Müşteri</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link to={`/admin/branches/${b.id}`}>
                      <strong>{getBranchLabel(b)}</strong>
                      <small>{b.email || "E-posta yok"}</small>
                    </Link>
                  </td>
                  <td>
                    <span className={`admin-badge ${b.active ? "ok" : "off"}`}>{b.active ? "Aktif" : "Pasif"}</span>
                  </td>
                  <td>{formatMoney(b.stats?.todayTotal || 0)}</td>
                  <td>{b.stats?.productCount || 0}</td>
                  <td>{b.stats?.customerCount || 0}</td>
                  <td>
                    <Link to={`/admin/branches/${b.id}`} className="btn btn-default btn-sm">
                      Aç
                    </Link>
                  </td>
                </tr>
              ))}
              {branches.length === 0 && (
                <tr>
                  <td colSpan={6} className="erp-table__empty">
                    Henüz şube yok. <Link to="/admin/branches/new">İlk şubeyi oluştur</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-branch-grid admin-mobile-list">
          {branches.map((b) => (
            <Link
              key={b.id}
              to={`/admin/branches/${b.id}`}
              className={`admin-branch-card admin-branch-card--link ${b.active ? "" : "inactive"}`}
            >
              <div className="admin-branch-card__head">
                <div>
                  <h3>{getBranchLabel(b)}</h3>
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
        </div>
      </section>
    </div>
  );
}
