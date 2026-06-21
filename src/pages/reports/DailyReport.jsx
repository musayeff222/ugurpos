import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../../store/StoreContext";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import { formatDateTime, formatMoney, isSameDay, todayISO } from "../../utils/format";

function DailySummaryCards({ cashRegisterTotal, cardTotal, openTotal, refundTotal }) {
  return (
    <>
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
    </>
  );
}

export default function DailyReport() {
  const { state } = useStore();
  const [date, setDate] = useState(todayISO());
  const [summarySheetOpen, setSummarySheetOpen] = useState(false);
  const [cardsInView, setCardsInView] = useState(false);
  const cardsRef = useRef(null);

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

  useEffect(() => {
    const node = cardsRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setCardsInView(entry.isIntersecting),
      { root: null, threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [date, rows.length]);

  const showSummaryFab = !summarySheetOpen && !cardsInView;

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

      <section ref={cardsRef} className="daily-terminal-report__cards" aria-label="Günlük özet kartları">
        <DailySummaryCards
          cashRegisterTotal={cashRegisterTotal}
          cardTotal={cardTotal}
          openTotal={openTotal}
          refundTotal={refundTotal}
        />
      </section>

      {showSummaryFab && (
        <button
          type="button"
          className="daily-summary-fab"
          onClick={() => setSummarySheetOpen(true)}
          aria-label="Özet kartları göster"
        >
          <i className="fa fa-chevron-up" aria-hidden="true" />
        </button>
      )}

      {summarySheetOpen && (
        <div className="daily-summary-sheet" role="dialog" aria-modal="true" aria-label="Günlük özet">
          <button
            type="button"
            className="daily-summary-sheet__backdrop"
            onClick={() => setSummarySheetOpen(false)}
            aria-label="Kapat"
          />
          <div className="daily-summary-sheet__panel">
            <div className="daily-summary-sheet__head">
              <strong>Günlük özet</strong>
              <button type="button" onClick={() => setSummarySheetOpen(false)} aria-label="Kapat">
                <i className="fa fa-times" aria-hidden="true" />
              </button>
            </div>
            <div className="daily-summary-sheet__cards">
              <DailySummaryCards
                cashRegisterTotal={cashRegisterTotal}
                cardTotal={cardTotal}
                openTotal={openTotal}
                refundTotal={refundTotal}
              />
            </div>
          </div>
        </div>
      )}

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
