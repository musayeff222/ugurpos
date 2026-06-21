import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../store/StoreContext";
import { formatDateTime, formatMoney, todayISO } from "../../utils/format";
import "../../styles/report-mobile.css";

const PAGE_SIZE = 12;

function formatQty(value) {
  return Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function isSaleInRange(createdAt, startDate, endDate, startTime, endTime) {
  const day = createdAt.slice(0, 10);
  const time = createdAt.length >= 16 ? createdAt.slice(11, 16) : "00:00";
  if (day < startDate || day > endDate) return false;
  if (day === startDate && time < startTime) return false;
  if (day === endDate && time > endTime) return false;
  return true;
}

function isDateInRange(date, startDate, endDate) {
  return date >= startDate && date <= endDate;
}

function paymentLabel(type) {
  if (type === "cash") return "Nakit";
  if (type === "pos") return "Pos";
  if (type === "open") return "Açık Hesap";
  return type || "—";
}

export default function DailyReport() {
  const navigate = useNavigate();
  const { state } = useStore();
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");
  const [showOtherFilters, setShowOtherFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState({
    startDate: todayISO(),
    endDate: todayISO(),
    startTime: "00:00",
    endTime: "23:59",
  });

  const productBuyMap = useMemo(() => {
    const map = {};
    state.products.forEach((product) => {
      map[product.id] = Number(product.buyPrice) || 0;
    });
    return map;
  }, [state.products]);

  const filteredSales = useMemo(
    () =>
      state.sales.filter((sale) =>
        isSaleInRange(
          sale.createdAt,
          applied.startDate,
          applied.endDate,
          applied.startTime,
          applied.endTime
        )
      ),
    [state.sales, applied]
  );

  const rows = useMemo(
    () =>
      filteredSales
        .filter((sale) => sale.paymentType !== "refund")
        .map((sale) => ({
          ...sale,
          itemCount: sale.items.reduce((acc, item) => acc + item.qty, 0),
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [filteredSales]
  );

  const refundTotal = filteredSales
    .filter((sale) => sale.paymentType === "refund")
    .reduce((sum, sale) => sum + Math.abs(sale.total || 0), 0);

  const cashTotal = rows.filter((row) => row.paymentType === "cash").reduce((sum, row) => sum + row.total, 0);
  const cardTotal = rows.filter((row) => row.paymentType === "pos").reduce((sum, row) => sum + row.total, 0);
  const openTotal = rows.filter((row) => row.paymentType === "open").reduce((sum, row) => sum + row.total, 0);
  const total = rows.reduce((sum, row) => sum + row.total, 0);

  const incomesTotal = state.income
    .filter((item) => isDateInRange(item.date, applied.startDate, applied.endDate))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const expensesTotal = state.expense
    .filter((item) => isDateInRange(item.date, applied.startDate, applied.endDate))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const firmPayments = state.purchaseInvoices
    .filter((invoice) => isDateInRange(invoice.date, applied.startDate, applied.endDate))
    .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);

  const productCost = rows.reduce((sum, sale) => {
    return (
      sum +
      sale.items.reduce((itemSum, item) => {
        const buyPrice = productBuyMap[item.productId] || 0;
        return itemSum + item.qty * buyPrice;
      }, 0)
    );
  }, 0);

  const profit = total - productCost;
  const profitPct = productCost > 0 ? (profit / productCost) * 100 : 0;
  const netProfit = profit + incomesTotal - expensesTotal - refundTotal;
  const cashRegisterTotal = cashTotal;

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const receivedPayments = 0;

  const summaryCards = [
    { label: "Nakit", value: formatMoney(cashTotal) },
    { label: "Pos", value: formatMoney(cardTotal) },
    { label: "Açık Hesap", value: formatMoney(openTotal) },
    { label: "Toplam", value: formatMoney(total) },
    { label: "Alınan Ödemeler", value: formatMoney(receivedPayments) },
    { label: "Firma Ödemeleri", value: formatMoney(firmPayments) },
    { label: "Gelirler", value: formatMoney(incomesTotal) },
    { label: "Giderler", value: formatMoney(expensesTotal) },
    { label: "Nakit Kasa", value: formatMoney(cashRegisterTotal) },
    {
      label: "Kâr",
      value: formatMoney(profit),
      hint: productCost > 0 ? `(%${profitPct.toFixed(0)})` : "",
    },
    { label: "Net Kâr", value: formatMoney(netProfit) },
    { label: "Ciro", value: formatMoney(total) },
    { label: "Ürün Maliyeti", value: formatMoney(productCost) },
  ];

  const applyFilters = () => {
    setApplied({ startDate, endDate, startTime, endTime });
    setPage(1);
  };

  return (
    <div className="report-page">
      <header className="report-hero">
        <div className="report-hero__top">
          <button type="button" className="report-back" onClick={() => navigate(-1)} aria-label="Geri">
            <i className="fa fa-arrow-left" aria-hidden="true" />
          </button>
          <h1>Günlük Rapor</h1>
          <div className="report-actions">
            <button type="button" aria-label="Özet" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}>
              <i className="fa fa-eye" aria-hidden="true" />
            </button>
            <button type="button" aria-label="Kasa" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}>
              <i className="fa fa-money" aria-hidden="true" />
            </button>
            <button type="button" aria-label="Yazdır" onClick={() => window.print()}>
              <i className="fa fa-print" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="report-filters">
          <div className="report-filter-grid">
            <label className="report-pill">
              <span>Başlangıç tarihi</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="report-pill">
              <span>Bitiş tarihi</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </div>

          <button
            type="button"
            className="report-other-filters"
            onClick={() => setShowOtherFilters((open) => !open)}
            aria-expanded={showOtherFilters}
          >
            Diğer filtreler
            <i className={`fa fa-chevron-${showOtherFilters ? "up" : "down"}`} aria-hidden="true" />
          </button>

          {showOtherFilters && (
            <div className="report-other-filters__panel">
              <label className="report-pill">
                <span>Başlangıç saati</span>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </label>
              <label className="report-pill">
                <span>Bitiş saati</span>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </label>
            </div>
          )}

          <button type="button" className="report-list-btn" onClick={applyFilters}>
            Listele
          </button>
        </div>
      </header>

      <div className="report-main">
        <div className="report-body">
          {rows.length === 0 ? (
            <p className="report-empty">Seçilen aralıkta satış yoxdur.</p>
          ) : (
            <>
              <div className="report-sale-list">
                {pageRows.map((sale) => (
                  <div key={sale.id} className="report-sale-row">
                    <div className="report-sale-row__left">
                      <i className="fa fa-file-text-o" aria-hidden="true" />
                      <div>
                        <strong>{sale.code}</strong>
                        <span className="report-sale-row__status">Başarılı</span>
                        <small>{sale.staffName || "—"}</small>
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

              <div className="report-desktop-table">
                <table>
                  <thead>
                    <tr>
                      <th>Satış kodu</th>
                      <th>Ürün adedi</th>
                      <th>Tutar</th>
                      <th>Ödeme</th>
                      <th>Personel</th>
                      <th>Saat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((sale) => (
                      <tr key={sale.id}>
                        <td>
                          <strong>{sale.code}</strong>
                        </td>
                        <td>{formatQty(sale.itemCount)}</td>
                        <td>{formatMoney(sale.total)}</td>
                        <td>{paymentLabel(sale.paymentType)}</td>
                        <td>{sale.staffName || "—"}</td>
                        <td>{formatDateTime(sale.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {rows.length > 0 && (
          <div className="report-pagination">
            <span>Sayfa:</span>
            <select
              value={safePage}
              onChange={(e) => setPage(Number(e.target.value))}
              aria-label="Sayfa seç"
            >
              {Array.from({ length: totalPages }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </select>
            <span>/ {totalPages}</span>
          </div>
        )}

        <footer className="report-summary" aria-label="Günlük özet">
          <div className="report-summary__grid">
            {summaryCards.map((card) => (
              <article key={card.label} className="report-summary-card">
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                {card.hint && <small>{card.hint}</small>}
              </article>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
