import { useMemo, useState } from "react";
import { useStore } from "../../store/StoreContext";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import { formatDateTime, formatMoney, isSameDay, todayISO } from "../../utils/format";

export default function DailyReport() {
  const { state } = useStore();
  const [date, setDate] = useState(todayISO());

  const rows = useMemo(
    () =>
      state.sales
        .filter((s) => s.paymentType !== "refund" && isSameDay(s.createdAt, date))
        .map((s) => ({
          ...s,
          itemCount: s.items.reduce((acc, i) => acc + i.qty, 0),
        })),
    [state.sales, date]
  );

  const total = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div>
      <PageHeader title="Günlük Rapor" subtitle={`Toplam: ${formatMoney(total)} (${rows.length} satış)`} />
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
              { key: "code", label: "Satış kodu" },
              { key: "itemCount", label: "Ürün adedi" },
              { key: "total", label: "Tutar", render: (r) => formatMoney(r.total) },
              { key: "paymentType", label: "Ödeme tipi" },
              { key: "staffName", label: "Personel" },
              { key: "createdAt", label: "Saat", render: (r) => formatDateTime(r.createdAt) },
            ]}
            rows={rows}
          />
        </div>
      </div>
    </div>
  );
}
