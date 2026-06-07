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
    <div className="admin-page">
      <PageHeader
        title="Özet"
        subtitle={`${summary?.branchCount ?? 0} aktif şube`}
        actions={
          <Link to="/admin/branches/new" className="btn btn-success btn-sm admin-hide-mobile">
            + Yeni Şube
          </Link>
        }
      />

      {error && <div className="alert alert-danger">{error}</div>}

      {summary && (
        <>
          <div className="admin-quick-actions">
            <Link to="/admin/branches/new" className="admin-quick-action">
              <i className="fa fa-plus" />
              <span>Yeni şube</span>
            </Link>
            <Link to="/admin/branches" className="admin-quick-action">
              <i className="fa fa-building" />
              <span>Şubeler</span>
            </Link>
            <Link to="/admin/qr-menu" className="admin-quick-action">
              <i className="fa fa-qrcode" />
              <span>QR menü</span>
            </Link>
          </div>

          <div className="admin-stats admin-stats--compact">
            <div className="admin-stat-card">
              <span>Şube</span>
              <strong>{summary.branchCount}</strong>
            </div>
            <div className="admin-stat-card">
              <span>Kullanıcı</span>
              <strong>{summary.userCount}</strong>
            </div>
          </div>

          <h3 className="admin-section-title">Şubeler</h3>
          <div className="admin-branch-grid admin-branch-grid--simple">
            {summary.branches.map((b) => (
              <Link key={b.id} to={`/admin/branches/${b.id}`} className="admin-branch-card admin-branch-card--link">
                <div className="admin-branch-card__head">
                  <div>
                    <h3>
                      #{b.branchNo} {b.name}
                    </h3>
                    <span className="admin-branch-email">{b.email || "E-posta yok"}</span>
                  </div>
                  <span className={`admin-badge ${b.active ? "ok" : "off"}`}>{b.active ? "Aktif" : "Pasif"}</span>
                </div>
                <div className="admin-branch-card__stats admin-branch-card__stats--2">
                  <div>
                    <span>Ürün</span>
                    <strong>{b.productCount}</strong>
                  </div>
                  <div>
                    <span>Satış</span>
                    <strong>{b.saleCount}</strong>
                  </div>
                </div>
              </Link>
            ))}
            {summary.branches.length === 0 && (
              <div className="card admin-empty">
                <p>Henüz şube yok.</p>
                <Link to="/admin/branches/new" className="btn btn-success btn-sm">
                  İlk şubeyi oluştur
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
