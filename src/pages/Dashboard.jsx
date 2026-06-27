import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store/StoreContext";
import { formatDateTime, formatMoney } from "../utils/format";
import { getActiveBusinessWindow, isTimestampInWindow } from "../utils/businessHours";
import "../styles/report-mobile.css";

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

function formatQty(value) {
  return Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function paymentLabel(type) {
  if (type === "cash") return "Nakit";
  if (type === "pos") return "Pos";
  if (type === "open") return "Açık Hesap";
  if (type === "refund") return "İade";
  return type || "—";
}

export default function Dashboard() {
  const { state } = useStore();
  const businessWindow = useMemo(
    () =>
      getActiveBusinessWindow(
        state.branchSettings?.businessOpenTime || "08:00",
        state.branchSettings?.businessCloseTime || "17:00"
      ),
    [state.branchSettings]
  );
  const monthPrefix = businessWindow.businessDate.slice(0, 7);

  const stats = useMemo(() => {
    const todaySales = state.sales.filter(
      (s) => s.paymentType !== "refund" && isTimestampInWindow(s.createdAt, businessWindow)
    );
    const monthSales = state.sales.filter(
      (s) =>
        s.paymentType !== "refund" &&
        s.createdAt.slice(0, 7) === monthPrefix
    );
    const sum = (list) => list.reduce((acc, s) => acc + (s.total || 0), 0);
    return {
      todayCount: todaySales.length,
      todayTotal: sum(todaySales),
      monthCount: monthSales.length,
      monthTotal: sum(monthSales),
      businessDate: businessWindow.businessDate,
      businessHours: `${businessWindow.openTime}–${businessWindow.closeTime}`,
    };
  }, [state.sales, businessWindow, monthPrefix]);

  const recentSales = useMemo(
    () =>
      state.sales
        .filter((sale) => sale.paymentType !== "refund")
        .slice(0, 10)
        .map((sale) => ({
          ...sale,
          itemCount: sale.items?.reduce((sum, item) => sum + item.qty, 0) || 0,
          customerName: state.customers.find((c) => c.id === sale.customerId)?.name || "—",
        })),
    [state.sales, state.customers]
  );

  return (
    <div className="dashboard">
      <div className="row">
        <StatCard
          iconClass="success"
          badge={`İş günü ${stats.businessHours}`}
          badgeVariant="success"
          title="Toplam Satış"
          value={`${stats.todayCount} adet`}
        />
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
          <section className="report-recent-block" aria-label="Son satışlarınız">
            <header className="report-recent-block__hero">
              <div>
                <h2>Son satışlarınız</h2>
                <p>Son 10 satış · günlük rapor düzeni</p>
              </div>
              <Link to="/dreport" className="report-recent-block__link">
                Günlük rapor
                <i className="fa fa-chevron-right" aria-hidden="true" />
              </Link>
            </header>

            <div className="report-recent-block__body">
              {recentSales.length === 0 ? (
                <p className="report-empty">
                  Henüz satış yok.{" "}
                  <Link to="/sales">Satış Yap</Link> sayfasından satış gerçekleştirin.
                </p>
              ) : (
                <>
                  <div className="report-sale-list report-recent-block__list">
                    {recentSales.map((sale) => (
                      <div key={sale.id} className="report-sale-row">
                        <div className="report-sale-row__left">
                          <i className="fa fa-file-text-o" aria-hidden="true" />
                          <div>
                            <strong>{sale.code}</strong>
                            <span className="report-sale-row__status">Başarılı</span>
                            <small>
                              {sale.staffName || "—"} · {sale.customerName}
                            </small>
                          </div>
                        </div>
                        <div className="report-sale-row__center">
                          <span>{formatDateTime(sale.createdAt)}</span>
                          <small>{paymentLabel(sale.paymentType)}</small>
                        </div>
                        <div className="report-sale-row__right">
                          <span>
                            <em>Miktar</em>
                            {formatQty(sale.itemCount)}
                          </span>
                          <strong>
                            <em>Tutar</em>
                            {formatMoney(sale.total)}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="report-desktop-table report-recent-block__table">
                    <table>
                      <thead>
                        <tr>
                          <th>Satış kodu</th>
                          <th>Müşteri</th>
                          <th>Miktar</th>
                          <th>Tutar</th>
                          <th>Ödeme</th>
                          <th>Tarih</th>
                          <th>Personel</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentSales.map((sale) => (
                          <tr key={sale.id}>
                            <td>
                              <strong>{sale.code}</strong>
                            </td>
                            <td>{sale.customerName}</td>
                            <td>{formatQty(sale.itemCount)}</td>
                            <td>{formatMoney(sale.total)}</td>
                            <td>{paymentLabel(sale.paymentType)}</td>
                            <td>{formatDateTime(sale.createdAt)}</td>
                            <td>{sale.staffName || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
