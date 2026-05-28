import { useMemo } from "react";
import { useStore } from "../../store/StoreContext";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";

export default function StockReport() {
  const { state } = useStore();

  const rows = useMemo(() => {
    const sold = {};
    state.sales.forEach((s) => {
      s.items.forEach((item) => {
        sold[item.productId] = (sold[item.productId] || 0) + item.qty;
      });
    });
    return state.products.map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      sold: sold[p.id] || 0,
      criticalStock: p.criticalStock,
    }));
  }, [state.products, state.sales]);

  return (
    <div>
      <PageHeader title="Stok Hareket Raporu" />
      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: "name", label: "Ürün" },
              { key: "stock", label: "Mevcut stok" },
              { key: "sold", label: "Satılan" },
              { key: "criticalStock", label: "Kritik stok" },
            ]}
            rows={rows}
          />
        </div>
      </div>
    </div>
  );
}
