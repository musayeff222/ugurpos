import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../store/StoreContext";
import { formatMoney, todayISO } from "../../utils/format";
import "../../styles/mobile-report.css";

function defaultStartTime() {
  return "00:00";
}

function defaultEndTime() {
  return "23:59";
}

function parseRange(startDate, endDate, startTime, endTime) {
  const start = new Date(`${startDate}T${startTime}:00`);
  const end = new Date(`${endDate}T${endTime}:59`);
  return { start, end };
}

function saleInRange(createdAt, range) {
  const t = new Date(createdAt).getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
}

function buildProductRows(sales, products, range) {
  const map = {};
  const buyById = Object.fromEntries(products.map((p) => [p.id, p.buyPrice || 0]));

  sales
    .filter((s) => s.paymentType !== "refund" && saleInRange(s.createdAt, range))
    .forEach((s) => {
      s.items.forEach((item) => {
        const key = item.productId || item.name;
        if (!map[key]) {
          map[key] = { id: key, name: item.name, qty: 0, total: 0, profit: 0 };
        }
        const buy = item.productId ? buyById[item.productId] || 0 : 0;
        map[key].qty += item.qty;
        map[key].total += item.qty * item.price;
        map[key].profit += (item.price - buy) * item.qty;
      });
    });

  return Object.values(map).sort((a, b) => b.total - a.total);
}

export default function MobileProductReport() {
  const navigate = useNavigate();
  const { state } = useStore();
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);
  const [applied, setApplied] = useState(() =>
    parseRange(todayISO(), todayISO(), defaultStartTime(), defaultEndTime())
  );

  const rows = useMemo(
    () => buildProductRows(state.sales, state.products, applied),
    [state.sales, state.products, applied]
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          qty: acc.qty + row.qty,
          total: acc.total + row.total,
          profit: acc.profit + row.profit,
        }),
        { qty: 0, total: 0, profit: 0 }
      ),
    [rows]
  );

  const handleList = () => {
    setApplied(parseRange(startDate, endDate, startTime, endTime));
  };

  return (
    <div className="mobile-report">
      <header className="mobile-report__hero">
        <button type="button" className="mobile-report__back" onClick={() => navigate(-1)} aria-label="Geri">
          <i className="fa fa-arrow-left" />
        </button>
        <h1>Ürünsel Rapor</h1>
        <div className="mobile-report__filters">
          <label>
            <span>Başlangıç tarihi</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label>
            <span>Bitiş tarihi</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
          <label>
            <span>Başlangıç saati</span>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label>
            <span>Bitiş saati</span>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>
        <button type="button" className="mobile-report__submit" onClick={handleList}>
          Listele
        </button>
      </header>

      <section className="mobile-report__panel">
        <div className="mobile-report__table-wrap">
          <table className="mobile-report__table">
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Miktar</th>
                <th>Tutar</th>
                <th>Kâr</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td>Muhtelif</td>
                  <td>0.00</td>
                  <td>{formatMoney(0)}</td>
                  <td>{formatMoney(0)}</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.qty.toFixed(2)}</td>
                    <td>{formatMoney(row.total)}</td>
                    <td>{formatMoney(row.profit)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="mobile-report__totals">
        <div className="mobile-report__total-card">
          <span>Toplam Miktar</span>
          <strong>{totals.qty.toFixed(2)}</strong>
        </div>
        <div className="mobile-report__total-card">
          <span>Toplam Tutar</span>
          <strong>{formatMoney(totals.total)}</strong>
        </div>
        <div className="mobile-report__total-card">
          <span>Toplam Kar</span>
          <strong>{formatMoney(totals.profit)}</strong>
        </div>
      </footer>
    </div>
  );
}
