import { useMemo, useState } from "react";
import { useStore } from "../../store/StoreContext";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import { downloadCsv, formatMoney, todayISO } from "../../utils/format";

export default function HistoricalReport() {
  const { state } = useStore();
  const [from, setFrom] = useState(todayISO().slice(0, 8) + "01");
  const [to, setTo] = useState(todayISO());

  const rows = useMemo(() => {
    const map = {};
    state.sales
      .filter((s) => s.paymentType !== "refund")
      .forEach((s) => {
        const day = s.createdAt.slice(0, 10);
        if (day < from || day > to) return;
        if (!map[day]) map[day] = { id: day, date: day, count: 0, total: 0 };
        map[day].count += 1;
        map[day].total += s.total;
      });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [state.sales, from, to]);

  const exportCsv = () => {
    downloadCsv("tarihsel-rapor.csv", [
      ["Tarih", "Satış adedi", "Toplam"],
      ...rows.map((r) => [r.date, r.count, r.total.toFixed(2)]),
    ]);
  };

  return (
    <div>
      <PageHeader
        title="Tarihsel Rapor"
        actions={
          <button type="button" className="btn btn-secondary" onClick={exportCsv}>
            Dışa Aktar
          </button>
        }
      />
      <div className="card filter-bar">
        <label>
          Başlangıç <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Bitiş <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: "date", label: "Tarih" },
              { key: "count", label: "Satış adedi" },
              { key: "total", label: "Toplam", render: (r) => formatMoney(r.total) },
            ]}
            rows={rows}
          />
        </div>
      </div>
    </div>
  );
}
