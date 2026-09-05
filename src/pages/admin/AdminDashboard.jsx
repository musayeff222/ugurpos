import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { formatMoney } from "../../utils/format";
import { getBranchLabel } from "../../utils/branchDisplay";

const TYPE_LABELS = {
  branch_login: "Giriş",
  admin_login: "Yönetici",
  qr_order: "Sipariş",
};

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getAdminSummary()
      .then(setSummary)
      .catch((e) => setError(e.message));
  }, []);

  const metrics = summary
    ? [
        { label: "Aktif hesap", value: summary.branchCount, hint: "şube" },
        { label: "Bugünkü ciro", value: formatMoney(summary.todayTotal || 0), hint: `${summary.todayCount || 0} satış` },
        { label: "Aylık ciro", value: formatMoney(summary.monthTotal || 0), hint: `${summary.monthCount || 0} satış` },
        { label: "Açık sipariş", value: summary.pendingQrOrders || 0, hint: "web / QR" },
        { label: "Ürün", value: summary.productCount || 0, hint: "katalog" },
        { label: "Müşteri", value: summary.customerCount || 0, hint: "kayıt" },
      ]
    : [];

  return (
    <div className="admin-page erp-page">
      <div className="crm-listbar">
        <div>
          <h2>Ana sayfa</h2>
          <span>Firma özeti · bugün</span>
        </div>
        <div className="crm-listbar__tools">
          <Link to="/admin/products" className="btn btn-default btn-sm">
            Ürünler
          </Link>
          <Link to="/admin/branches/new" className="btn btn-primary btn-sm">
            Yeni hesap
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {summary && (
        <>
          <div className="crm-metrics">
            {metrics.map((kpi) => (
              <article key={kpi.label}>
                <span>{kpi.label}</span>
                <strong>{kpi.value}</strong>
                <small>{kpi.hint}</small>
              </article>
            ))}
          </div>

          <div className="erp-split">
            <section className="erp-panel">
              <header className="erp-panel__head">
                <h3>Son görüntülenen hesaplar</h3>
                <Link to="/admin/branches">Tüm liste</Link>
              </header>
              <div className="admin-table-wrap">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Hesap adı</th>
                      <th>Durum</th>
                      <th>Bugün</th>
                      <th>Ürün</th>
                      <th>Satış</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.branches.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <Link className="crm-account" to={`/admin/branches/${b.id}`}>
                            <span className="crm-avatar">{String(getBranchLabel(b)).slice(0, 2).toUpperCase()}</span>
                            <span>
                              <strong>{getBranchLabel(b)}</strong>
                              <small>{b.email || "—"}</small>
                            </span>
                          </Link>
                        </td>
                        <td>
                          <span className={`admin-badge ${b.active ? "ok" : "off"}`}>
                            {b.active ? "Aktif" : "Pasif"}
                          </span>
                        </td>
                        <td>{formatMoney(b.stats?.todayTotal || 0)}</td>
                        <td>{b.productCount}</td>
                        <td>{b.saleCount}</td>
                      </tr>
                    ))}
                    {summary.branches.length === 0 && (
                      <tr>
                        <td colSpan={5} className="erp-table__empty">
                          Kayıt yok. <Link to="/admin/branches/new">Hesap oluştur</Link>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="erp-panel">
              <header className="erp-panel__head">
                <h3>Aktivite geçmişi</h3>
                <Link to="/admin/activity">Tümü</Link>
              </header>
              <div className="erp-timeline">
                {(summary.recentActivity || []).map((item) => (
                  <article key={item.id}>
                    <span>{TYPE_LABELS[item.type] || item.type}</span>
                    <strong>{item.title}</strong>
                    <small>
                      {item.branchName || "Merkez"} · {new Date(item.createdAt).toLocaleString("tr-TR")}
                    </small>
                  </article>
                ))}
                {(!summary.recentActivity || summary.recentActivity.length === 0) && (
                  <p className="hint-text">Aktivite yok.</p>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
