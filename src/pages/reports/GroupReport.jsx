import { useMemo } from "react";
import { useStore } from "../../store/StoreContext";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import { formatMoney } from "../../utils/format";

export default function GroupReport() {
  const { state } = useStore();

  const rows = useMemo(() => {
    const map = {};
    state.sales
      .filter((s) => s.paymentType !== "refund")
      .forEach((s) => {
        s.items.forEach((item) => {
          const product = state.products.find((p) => p.id === item.productId);
          const group = state.groups.find((g) => g.id === product?.groupId)?.name || "Diğer";
          if (!map[group]) map[group] = { id: group, group, qty: 0, total: 0 };
          map[group].qty += item.qty;
          map[group].total += item.qty * item.price;
        });
      });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [state.sales, state.products, state.groups]);

  return (
    <div>
      <PageHeader title="Grupsal Rapor" />
      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: "group", label: "Grup" },
              { key: "qty", label: "Adet" },
              { key: "total", label: "Ciro", render: (r) => formatMoney(r.total) },
            ]}
            rows={rows}
          />
        </div>
      </div>
    </div>
  );
}
