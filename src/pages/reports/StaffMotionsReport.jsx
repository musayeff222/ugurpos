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

  return (
    <div>
      <PageHeader title="Personel Hareket Raporu" />
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
