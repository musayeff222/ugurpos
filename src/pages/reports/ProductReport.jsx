import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../store/StoreContext";
import { formatMoney, todayISO } from "../../utils/format";
import "../../styles/product-report.css";

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

export default function ProductReport() {
  const navigate = useNavigate();
  const { state } = useStore();
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");
  const [applied, setApplied] = useState({
    startDate: todayISO(),
    endDate: todayISO(),
    startTime: "00:00",
    endTime: "23:59",
  });

  const productMetaMap = useMemo(() => {
    const map = {};
    state.products.forEach((product) => {
      map[product.id] = {
        buyPrice: Number(product.buyPrice) || 0,
        code: product.stockCode || product.barcode || product.id,
      };
    });
    return map;
  }, [state.products]);

  const rows = useMemo(() => {
    const map = {};
    state.sales
      .filter(
        (sale) =>
          sale.paymentType !== "refund" &&
          isSaleInRange(
            sale.createdAt,
            applied.startDate,
            applied.endDate,
            applied.startTime,
            applied.endTime
          )
      )
      .forEach((sale) => {
        sale.items.forEach((item) => {
          const key = item.productId || item.name;
          const meta = productMetaMap[item.productId];
          const buyPrice = meta?.buyPrice || 0;
          const lineTotal = item.qty * item.price;
          const lineProfit = item.qty * (item.price - buyPrice);

          if (!map[key]) {
            map[key] = {
              id: key,
              name: item.name,
              code: meta?.code || String(key).slice(-8),
              qty: 0,
              total: 0,
              profit: 0,
            };
          }
          map[key].qty += item.qty;
          map[key].total += lineTotal;
          map[key].profit += lineProfit;
        });
      });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [state.sales, productMetaMap, applied]);

  const totalQty = rows.reduce((sum, row) => sum + row.qty, 0);
  const totalAmount = rows.reduce((sum, row) => sum + row.total, 0);
  const totalProfit = rows.reduce((sum, row) => sum + row.profit, 0);

  const applyFilters = () => {
    setApplied({ startDate, endDate, startTime, endTime });
  };

  return (
    <div className="product-report-page">
      <header className="product-report-hero">
        <div className="product-report-hero__top">
          <button
            type="button"
            className="product-report-back"
            onClick={() => navigate(-1)}
            aria-label="Geri"
          >
            <i className="fa fa-arrow-left" aria-hidden="true" />
          </button>
          <h1>Ürünsel Rapor</h1>
        </div>

        <div className="product-report-filters">
          <div className="product-report-filter-grid">
            <label className="product-report-pill">
              <span>Başlangıç tarihi</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="product-report-pill">
              <span>Bitiş tarihi</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
            <label className="product-report-pill">
              <span>Başlangıç saati</span>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </label>
            <label className="product-report-pill">
              <span>Bitiş saati</span>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </label>
          </div>
          <button type="button" className="product-report-list-btn" onClick={applyFilters}>
            Listele
          </button>
        </div>
      </header>

      <div className="product-report-body">
        {rows.length === 0 ? (
          <p className="product-report-empty">Seçilen aralıkta satış verisi yok.</p>
        ) : (
          <>
            <table className="product-report-table">
              <thead>
                <tr>
                  <th>Ürün</th>
                  <th>Miktar</th>
                  <th>Tutar</th>
                  <th>Kâr</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      <small>{row.code}</small>
                    </td>
                    <td>{formatQty(row.qty)}</td>
                    <td>{formatMoney(row.total)}</td>
                    <td>{formatMoney(row.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="product-report-mobile-rows">
              {rows.map((row) => (
                <div key={row.id} className="product-report-mobile-row">
                  <div className="product-report-mobile-row__main">
                    <strong>{row.name}</strong>
                    <small>{row.code}</small>
                  </div>
                  <div className="product-report-mobile-row__values">
                    <span>
                      <em>Miktar</em>
                      {formatQty(row.qty)}
                    </span>
                    <span>
                      <em>Tutar</em>
                      {formatMoney(row.total)}
                    </span>
                    <span>
                      <em>Kâr</em>
                      {formatMoney(row.profit)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <footer className="product-report-summary" aria-label="Rapor özeti">
        <div className="product-report-summary__cards">
          <article className="product-report-summary-card">
            <span>Toplam Miktar</span>
            <strong>{formatQty(totalQty)}</strong>
          </article>
          <article className="product-report-summary-card">
            <span>Toplam Tutar</span>
            <strong>{formatMoney(totalAmount)}</strong>
          </article>
          <article className="product-report-summary-card">
            <span>Toplam Kar</span>
            <strong>{formatMoney(totalProfit)}</strong>
          </article>
        </div>
      </footer>
    </div>
  );
}
