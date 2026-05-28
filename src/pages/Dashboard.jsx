import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store/StoreContext";
import DataTable from "../components/ui/DataTable";
import { formatDateTime, formatMoney, isSameDay, todayISO } from "../utils/format";

function StatCard({ iconClass, badge, badgeVariant, title, value, help }) {
  return (
    <div className="col stat-col">
      <div className="card stat-card">
        <div className="stat-card-body">
          <div className="stat-left">
            <span className={`stat-icon ${iconClass}`}>
              <i className="fa fa-line-chart" />
            </span>
            <span className={`badge badge-${badgeVariant}`}>{badge}</span>
          </div>
          <div className="stat-right">
            <h5>
              {title}
              {help && <i className="fa fa-question-circle help-icon" title={help} />}
            </h5>
            <h4>{value}</h4>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { state } = useStore();
  const today = todayISO();
  const monthPrefix = today.slice(0, 7);

  const stats = useMemo(() => {
    const todaySales = state.sales.filter((s) => s.paymentType !== "refund" && isSameDay(s.createdAt, today));
    const monthSales = state.sales.filter(
      (s) => s.paymentType !== "refund" && s.createdAt.slice(0, 7) === monthPrefix
    );
    const sum = (list) => list.reduce((acc, s) => acc + (s.total || 0), 0);
    return {
      todayCount: todaySales.length,
      todayTotal: sum(todaySales),
      monthCount: monthSales.length,
      monthTotal: sum(monthSales),
    };
  }, [state.sales, today, monthPrefix]);

  const recentSales = state.sales.slice(0, 10);

  return (
    <div className="dashboard">
      <div className="row">
        <StatCard iconClass="success" badge="Bugün" badgeVariant="success" title="Toplam Satış" value={`${stats.todayCount} adet`} />
        <StatCard iconClass="warning" badge="Bugün" badgeVariant="success" title="Net Kazanç" value={formatMoney(stats.todayTotal)} help="Net kazanç nedir?" />
        <StatCard iconClass="success" badge="Bu ay" badgeVariant="primary" title="Toplam Satış" value={`${stats.monthCount} adet`} />
        <StatCard iconClass="warning" badge="Bu ay" badgeVariant="primary" title="Net Kazanç" value={formatMoney(stats.monthTotal)} help="Net kazanç nedir?" />
      </div>

      <div className="row">
        <div className="col half-col">
          <div className="card chart-card">
            <div className="card-header">
              <h5>30 Günlük Satış Grafiği</h5>
            </div>
            <div className="card-body chart-placeholder">
              <div className="chart-bars">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="chart-bar" style={{ height: `${20 + ((stats.todayCount + i) % 5) * 15}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="col half-col">
          <div className="card">
            <div className="card-header">
              <h5>Özet</h5>
            </div>
            <div className="card-body summary-list">
              <p>
                <span>Toplam ürün</span>
                <strong>{state.products.length}</strong>
              </p>
              <p>
                <span>Müşteri</span>
                <strong>{state.customers.length}</strong>
              </p>
              <p>
                <span>Toplam borç</span>
                <strong>{formatMoney(state.customers.reduce((s, c) => s + (c.debt || 0), 0))}</strong>
              </p>
              <p>
                <span>Kritik stok</span>
                <strong>{state.products.filter((p) => p.stock <= p.criticalStock).length}</strong>
              </p>
              <Link to="/sales" className="btn btn-success">
                Satış Yap
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col full-col">
          <div className="card">
            <div className="card-header">
              <h5>Son satışlarınız</h5>
            </div>
            <div className="card-body">
              <DataTable
                columns={[
                  { key: "code", label: "Satış kodu" },
                  { key: "customer", label: "Müşteri", render: (r) => state.customers.find((c) => c.id === r.customerId)?.name || "—" },
                  { key: "items", label: "Toplam ürün", render: (r) => r.items?.reduce((s, i) => s + i.qty, 0) || 0 },
                  { key: "total", label: "Toplam tutar", render: (r) => formatMoney(r.total) },
                  { key: "paymentType", label: "Ödeme tipi" },
                  { key: "createdAt", label: "Tarih", render: (r) => formatDateTime(r.createdAt) },
                  { key: "staffName", label: "Personel" },
                ]}
                rows={recentSales}
                emptyText="Henüz satış yok. Satış Yap sayfasından satış gerçekleştirin."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
