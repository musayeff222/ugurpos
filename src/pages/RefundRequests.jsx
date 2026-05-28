import { useStore } from "../store/StoreContext";
import DataTable from "../components/ui/DataTable";
import PageHeader from "../components/ui/PageHeader";

export default function RefundRequests() {
  const { state } = useStore();

  return (
    <div>
      <PageHeader title="İade Talepleri" />
      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: "date", label: "Tarih" },
              { key: "productName", label: "Ürün" },
              { key: "reason", label: "Sebep" },
              { key: "status", label: "Durum" },
            ]}
            rows={state.refundRequests}
            emptyText="Bekleyen iade talebi yok."
          />
        </div>
      </div>
    </div>
  );
}
