import { useMemo, useState } from "react";
import { useStore } from "../../store/StoreContext";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import { formatDateTime, formatMoney, isSameDay, todayISO } from "../../utils/format";

export default function DailyReport() {
  const { state } = useStore();
  const [date, setDate] = useState(todayISO());

  const rows = useMemo(
    () =>
      state.sales
        .filter((s) => s.paymentType !== "refund" && isSameDay(s.createdAt, date))
        .map((s) => ({
          ...s,
          itemCount: s.items.reduce((acc, i) => acc + i.qty, 0),
        })),
    [state.sales, date]
  );

  const total = rows.reduce((s, r) => s + r.total, 0);
  const cashTotal = rows.filter((r) => r.paymentType === "cash").reduce((s, r) => s + r.total, 0);
  const cardTotal = rows.filter((r) => r.paymentType === "pos").reduce((s, r) => s + r.total, 0);
  const openTotal = rows.filter((r) => r.paymentType === "open").reduce((s, r) => s + r.total, 0);
  const refundTotal = state.sales
    .filter((s) => s.paymentType === "refund" && isSameDay(s.createdAt, date))
    .reduce((s, r) => s + Math.abs(r.total || 0), 0);
  const cashRegisterTotal = cashTotal;

  return (
    <div className="daily-terminal-report">
      <PageHeader title="Günlük Rapor" subtitle={`${date} · ${rows.length} satış`} />

      <section className="daily-terminal-report__top">
        <div className="daily-terminal-report__date">
          <span>Tarih</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="daily-terminal-report__total">
          <span>GÜNLÜK CƏMİ</span>
          <strong>{formatMoney(total)}</strong>
        </div>
      </section>

      <section className="daily-terminal-report__cards">
        <article className="daily-report-card daily-report-card--cash">
          <span>Kassada olan nakit</span>
          <strong>{formatMoney(cashRegisterTotal)}</strong>
          <small>Nakit satışlardan hesablanır</small>
        </article>
        <article className="daily-report-card daily-report-card--card">
          <span>Kart / POS satış</span>
          <strong>{formatMoney(cardTotal)}</strong>
          <small>Kart terminal toplamı</small>
        </article>
        <article className="daily-report-card">
          <span>Açık hesap</span>
          <strong>{formatMoney(openTotal)}</strong>
          <small>Müştəri borcuna yazılan</small>
        </article>
        <article className="daily-report-card daily-report-card--muted">
          <span>İade</span>
          <strong>{formatMoney(refundTotal)}</strong>
          <small>Gün içi iade toplamı</small>
        </article>
      </section>

      <section className="daily-terminal-report__mobile-list">
        {rows.length === 0 ? (
          <div className="daily-sale-card daily-sale-card--empty">Bu tarixdə satış yoxdur.</div>
        ) : (
          rows.map((sale) => (
            <div key={sale.id} className="daily-sale-card">
              <div>
                <strong>{sale.code}</strong>
                <span>{formatDateTime(sale.createdAt)}</span>
              </div>
              <div>
                <span>{sale.staffName || "—"}</span>
                <b>{formatMoney(sale.total)}</b>
              </div>
              <small>
                {sale.itemCount} ürün · {sale.paymentType}
              </small>
            </div>
          ))
        )}
      </section>

      <div className="card daily-terminal-report__table">
        <div className="card-body">
          <DataTable
            columns={[
              { key: "code", label: "Satış kodu" },
              { key: "itemCount", label: "Ürün adedi" },
              { key: "total", label: "Tutar", render: (r) => formatMoney(r.total) },
              { key: "paymentType", label: "Ödeme tipi" },
              { key: "staffName", label: "Personel" },
              { key: "createdAt", label: "Saat", render: (r) => formatDateTime(r.createdAt) },
            ]}
            rows={rows}
          />
        </div>
      </div>
    </div>
  );
}
