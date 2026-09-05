import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { formatMoney } from "../../utils/format";
import { getBranchLabel } from "../../utils/branchDisplay";

const TYPE_LABELS = {
  branch_login: "Şube girişi",
  admin_login: "Admin girişi",
  qr_order: "Web siparişi",
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

  const kpis = summary
    ? [
        { label: "Aktif şube", value: summary.branchCount, hint: "Canlı operasyon", icon: "fa-sitemap", tone: "blue" },
        { label: "Bugünkü ciro", value: formatMoney(summary.todayTotal || 0), hint: `${summary.todayCount || 0} satış`, icon: "fa-money", tone: "green" },
        { label: "Aylık ciro", value: formatMoney(summary.monthTotal || 0), hint: `${summary.monthCount || 0} satış`, icon: "fa-bar-chart", tone: "navy" },
        { label: "Bekleyen sipariş", value: summary.pendingQrOrders || 0, hint: "Web / QR", icon: "fa-shopping-bag", tone: "amber" },
        { label: "Toplam ürün", value: summary.productCount || 0, hint: "Tüm şubeler", icon: "fa-cube", tone: "teal" },
        { label: "Müşteri", value: summary.customerCount || 0, hint: "CRM kayıtları", icon: "fa-users", tone: "purple" },
      ]
    : [];

  return (
    <div className="admin-page erp-page">
      <section className="erp-hero">
        <div>
          <p className="erp-kicker">Super Admin · ERP / CRM</p>
          <h2>Komuta merkezi</h2>
          <p>Tüm şubelerin satış, kasa, stok ve web siparişini tek panelden yönetin.</p>
        </div>
        <div className="erp-hero__actions">
          <Link to="/admin/branches/new" className="btn btn-success">
            + Yeni şube
          </Link>
          <Link to="/admin/cash-reports" className="btn btn-default">
            Finans raporları
          </Link>
        </div>
      </section>

      {error && <div className="alert alert-danger">{error}</div>}

      {summary && (
        <>
          <div className="erp-kpi-grid">
            {kpis.map((kpi) => (
              <article key={kpi.label} className={`erp-kpi erp-kpi--${kpi.tone}`}>
                <i className={`fa ${kpi.icon}`} aria-hidden />
                <div>
                  <span>{kpi.label}</span>
                  <strong>{kpi.value}</strong>
                  <small>{kpi.hint}</small>
                </div>
              </article>
            ))}
          </div>

          <div className="erp-modules">
            <Link to="/admin/branches" className="erp-module">
              <i className="fa fa-sitemap" />
              <div>
                <strong>Şube CRM</strong>
                <span>Şube, personel ve stok</span>
              </div>
            </Link>
            <Link to="/admin/cash-reports" className="erp-module">
              <i className="fa fa-money" />
              <div>
                <strong>Finans</strong>
                <span>Kasa, gider, gün sonu</span>
              </div>
            </Link>
            <Link to="/admin/qr-menu" className="erp-module">
              <i className="fa fa-qrcode" />
              <div>
                <strong>Omnichannel</strong>
                <span>QR menü ve web sipariş</span>
              </div>
            </Link>
            <Link to="/admin/settings" className="erp-module">
              <i className="fa fa-shield" />
              <div>
                <strong>Sistem</strong>
                <span>Firma ve güvenlik</span>
              </div>
            </Link>
          </div>

          <div className="erp-split">
            <section className="erp-panel">
              <header className="erp-panel__head">
                <h3>Şube performansı</h3>
                <Link to="/admin/branches">Tümünü gör</Link>
              </header>
              <div className="admin-table-wrap">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Şube</th>
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
                          <Link to={`/admin/branches/${b.id}`}>
                            <strong>{getBranchLabel(b)}</strong>
                            <small>{b.email || "E-posta yok"}</small>
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
                          Henüz şube yok.{" "}
                          <Link to="/admin/branches/new">İlk şubeyi oluştur</Link>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="erp-panel">
              <header className="erp-panel__head">
                <h3>Son hareketler</h3>
                <Link to="/admin/activity">Akış</Link>
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
                  <p className="hint-text">Henüz hareket yok.</p>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
