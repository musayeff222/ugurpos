import { useMemo } from "react";
import { useStore } from "../../store/StoreContext";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import { formatMoney } from "../../utils/format";

export default function ProductReport() {
  const { state } = useStore();

  const rows = useMemo(() => {
    const map = {};
    state.sales
      .filter((s) => s.paymentType !== "refund")
      .forEach((s) => {
        s.items.forEach((item) => {
          const key = item.productId || item.name;
          if (!map[key]) map[key] = { id: key, name: item.name, qty: 0, total: 0 };
          map[key].qty += item.qty;
          map[key].total += item.qty * item.price;
        });
      });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [state.sales]);

  return (
    <div>
      <PageHeader title="Ürünsel Rapor" subtitle="Satılan ürünlere göre" />
      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: "name", label: "Ürün" },
              { key: "qty", label: "Satış adedi" },
              { key: "total", label: "Toplam ciro", render: (r) => formatMoney(r.total) },
            ]}
            rows={rows}
          />
        </div>
      </div>
    </div>
  );
}
