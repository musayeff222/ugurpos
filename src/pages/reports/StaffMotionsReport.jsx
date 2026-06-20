import { useMemo } from "react";
import { useStore } from "../../store/StoreContext";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import { formatDateTime, formatMoney } from "../../utils/format";

export default function StaffMotionsReport() {
  const { state } = useStore();

  const rows = useMemo(
    () =>
      state.sales.map((s) => ({
        ...s,
        itemsCount: s.items.reduce((acc, i) => acc + i.qty, 0),
      })),
    [state.sales]
  );

  const monthlyStaffRows = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    const map = new Map();
    state.sales
      .filter((s) => s.paymentType !== "refund" && s.createdAt?.slice(0, 7) === month)
      .forEach((sale) => {
        const staff = sale.staffName || "—";
        const prev = map.get(staff) || { id: staff, staffName: staff, saleCount: 0, total: 0 };
        prev.saleCount += 1;
        prev.total += sale.total || 0;
        map.set(staff, prev);
      });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [state.sales]);

  return (
    <div>
      <PageHeader title="Personel Hareket Raporu" />
      <div className="card">
        <div className="card-header">
          <h5>Bu Ay Personel Satış Performansı</h5>
        </div>
        <div className="card-body">
          <DataTable
            columns={[
              { key: "staffName", label: "Personel" },
              { key: "saleCount", label: "Satış adedi" },
              { key: "total", label: "Toplam satış", render: (r) => formatMoney(r.total) },
            ]}
            rows={monthlyStaffRows}
            searchable={false}
            emptyText="Bu ay personel satışı yok."
          />
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: "code", label: "Satış kodu" },
              { key: "staffName", label: "Personel" },
              { key: "paymentType", label: "İşlem" },
              { key: "itemsCount", label: "Ürün" },
              { key: "total", label: "Tutar", render: (r) => formatMoney(r.total) },
              { key: "createdAt", label: "Tarih", render: (r) => formatDateTime(r.createdAt) },
            ]}
            rows={rows}
          />
        </div>
      </div>
    </div>
  );
}
