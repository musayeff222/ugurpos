import { useMemo, useState } from "react";
import { useStore } from "../../store/StoreContext";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import MobileProductReport from "../../components/reports/MobileProductReport";
import useIsDesktop from "../../hooks/useIsDesktop";
import { formatMoney, todayISO } from "../../utils/format";

export default function ProductReport() {
  const isDesktop = useIsDesktop();
  const { state } = useStore();
  const [date, setDate] = useState(todayISO());

  const rows = useMemo(() => {
    const buyById = Object.fromEntries(state.products.map((p) => [p.id, p.buyPrice || 0]));
    const map = {};
    state.sales
      .filter((s) => s.paymentType !== "refund" && s.createdAt.slice(0, 10) === date)
      .forEach((s) => {
        s.items.forEach((item) => {
          const key = item.productId || item.name;
          if (!map[key]) map[key] = { id: key, name: item.name, qty: 0, total: 0, profit: 0 };
          const buy = item.productId ? buyById[item.productId] || 0 : 0;
          map[key].qty += item.qty;
          map[key].total += item.qty * item.price;
          map[key].profit += (item.price - buy) * item.qty;
        });
      });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [state.sales, state.products, date]);

  if (!isDesktop) {
    return <MobileProductReport />;
  }

  return (
    <div>
      <PageHeader title="Ürünsel Rapor" subtitle="Satılan ürünlere göre" />
      <div className="card filter-bar">
        <label>
          Tarih
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: "name", label: "Ürün" },
              { key: "qty", label: "Miktar", render: (r) => r.qty.toFixed(2) },
              { key: "total", label: "Tutar", render: (r) => formatMoney(r.total) },
              { key: "profit", label: "Kâr", render: (r) => formatMoney(r.profit) },
            ]}
            rows={rows}
          />
        </div>
      </div>
    </div>
  );
}
