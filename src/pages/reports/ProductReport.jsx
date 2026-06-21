import { useMemo } from "react";
import { useStore } from "../../store/StoreContext";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import { formatMoney } from "../../utils/format";

export default function ProductReport() {
  const { state } = useStore();

  const productBuyMap = useMemo(() => {
    const map = {};
    state.products.forEach((product) => {
      map[product.id] = Number(product.buyPrice) || 0;
    });
    return map;
  }, [state.products]);

  const rows = useMemo(() => {
    const map = {};
    state.sales
      .filter((s) => s.paymentType !== "refund")
      .forEach((s) => {
        s.items.forEach((item) => {
          const key = item.productId || item.name;
          const buyPrice = productBuyMap[item.productId] || 0;
          const lineTotal = item.qty * item.price;
          const lineProfit = item.qty * (item.price - buyPrice);

          if (!map[key]) {
            map[key] = { id: key, name: item.name, qty: 0, total: 0, profit: 0 };
          }
          map[key].qty += item.qty;
          map[key].total += lineTotal;
          map[key].profit += lineProfit;
        });
      });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [state.sales, productBuyMap]);

  const totalQty = rows.reduce((sum, row) => sum + row.qty, 0);
  const totalAmount = rows.reduce((sum, row) => sum + row.total, 0);
  const totalProfit = rows.reduce((sum, row) => sum + row.profit, 0);

  return (
    <div className="product-terminal-report">
      <PageHeader
        title="Ürünsel Rapor"
        subtitle={`${rows.length} ürün · ${totalQty} adet satış`}
      />

      <section className="product-terminal-report__mobile-list">
        {rows.length === 0 ? (
          <div className="daily-sale-card daily-sale-card--empty">Satış verisi yoxdur.</div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="daily-sale-card product-sale-card">
              <div>
                <strong>{row.name}</strong>
                <span>{row.qty} adet</span>
              </div>
              <div>
                <span>Kar: {formatMoney(row.profit)}</span>
                <b>{formatMoney(row.total)}</b>
              </div>
            </div>
          ))
        )}
      </section>

      <div className="card product-terminal-report__table">
        <div className="card-body">
          <DataTable
            columns={[
              { key: "name", label: "Ürün" },
              { key: "qty", label: "Satış adedi" },
              { key: "total", label: "Toplam tutar", render: (r) => formatMoney(r.total) },
              { key: "profit", label: "Kar", render: (r) => formatMoney(r.profit) },
            ]}
            rows={rows}
          />
        </div>
      </div>

      <section className="product-terminal-report__cards" aria-label="Ürün raporu özeti">
        <article className="daily-report-card daily-report-card--qty">
          <span>Toplam ürün miktarı</span>
          <strong>{totalQty}</strong>
          <small>Satılan toplam adet</small>
        </article>
        <article className="daily-report-card daily-report-card--cash">
          <span>Toplam tutar</span>
          <strong>{formatMoney(totalAmount)}</strong>
          <small>Ürün satış ciro toplamı</small>
        </article>
        <article className="daily-report-card daily-report-card--profit">
          <span>Toplam kar</span>
          <strong>{formatMoney(totalProfit)}</strong>
          <small>Satış fiyatı − alış fiyatı</small>
        </article>
      </section>
    </div>
  );
}
