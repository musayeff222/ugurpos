import { useState } from "react";
import { useStore } from "../store/StoreContext";
import DataTable from "../components/ui/DataTable";
import PageHeader from "../components/ui/PageHeader";
import { todayISO } from "../utils/format";
import { runAsync } from "../utils/runAsync";

export default function RefundRequests() {
  const { state, addRefundRequest, updateRefundRequest } = useStore();
  const [form, setForm] = useState({ productName: "", reason: "" });
  const [message, setMessage] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.productName.trim()) return;
    await runAsync(() => addRefundRequest(form), setMessage);
    setForm({ productName: "", reason: "" });
    setMessage("İade talebi oluşturuldu.");
  };

  const setStatus = async (id, status) => {
    await runAsync(() => updateRefundRequest(id, status), setMessage);
    setMessage("Talep güncellendi.");
  };

  return (
    <div>
      <PageHeader title="İade Talepleri" />
      {message && <div className="alert alert-info">{message}</div>}
      <form className="card form-inline-bar" onSubmit={handleCreate}>
        <input placeholder="Ürün adı" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} required />
        <input placeholder="Sebep" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <button type="submit" className="btn btn-success">
          Talep Oluştur
        </button>
      </form>
      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: "date", label: "Tarih", render: (r) => r.date || todayISO() },
              { key: "productName", label: "Ürün" },
              { key: "reason", label: "Sebep" },
              { key: "status", label: "Durum" },
              {
                key: "actions",
                label: "İşlem",
                render: (r) =>
                  r.status === "pending" ? (
                    <>
                      <button type="button" className="btn btn-success btn-sm" onClick={() => setStatus(r.id, "approved")}>
                        Onayla
                      </button>{" "}
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => setStatus(r.id, "rejected")}>
                        Reddet
                      </button>
                    </>
                  ) : (
                    "—"
                  ),
              },
            ]}
            rows={state.refundRequests}
            emptyText="Bekleyen iade talebi yok."
          />
        </div>
      </div>
    </div>
  );
}
