import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import PageHeader from "../../components/ui/PageHeader";

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getAdminSummary()
      .then(setSummary)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <PageHeader
        title="Admin Özet"
        actions={
          <Link to="/admin/branches/new" className="btn btn-success btn-sm">
            Yeni Şube
          </Link>
        }
      />
      {error && <div className="alert alert-danger">{error}</div>}
      {summary && (
        <>
          <div className="admin-stats">
            <div className="admin-stat-card">
              <span>Firma</span>
              <strong>{summary.firmName}</strong>
            </div>
            <div className="admin-stat-card">
              <span>Aktif şube</span>
              <strong>{summary.branchCount}</strong>
            </div>
            <div className="admin-stat-card">
              <span>Kullanıcı</span>
              <strong>{summary.userCount}</strong>
            </div>
          </div>

          <div className="card">
            <div className="admin-card-head">
              <h3>Şubeler</h3>
              <Link to="/admin/branches" className="btn btn-primary btn-sm">
                Yönet
              </Link>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Şube</th>
                  <th>Giriş Kodu</th>
                  <th>Ürün</th>
                  <th>Satış</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {summary.branches.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link to={`/admin/branches/${b.id}`}>{b.name}</Link>
                    </td>
                    <td>
                      <code>{b.loginCode || "—"}</code>
                    </td>
                    <td>{b.productCount}</td>
                    <td>{b.saleCount}</td>
                    <td>{b.active ? "Aktif" : "Pasif"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
