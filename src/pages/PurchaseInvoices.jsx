import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/StoreContext";
import DataTable from "../components/ui/DataTable";
import PageHeader from "../components/ui/PageHeader";
import { formatMoney, todayISO } from "../utils/format";
import { runAsync } from "../utils/runAsync";

export function PurchaseInvoices() {
  const { state } = useStore();
  return (
    <div>
      <PageHeader
        title="Alış Faturaları"
        actions={
          <Link to="/createinvoice" className="btn btn-success">
            Yeni Fatura
          </Link>
        }
      />
      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: "invoiceNo", label: "Fatura No" },
              { key: "firmName", label: "Firma" },
              { key: "date", label: "Tarih" },
              { key: "total", label: "Tutar", render: (r) => formatMoney(r.total) },
            ]}
            rows={state.purchaseInvoices}
          />
        </div>
      </div>
    </div>
  );
}

export function CreateInvoice() {
  const { state, addPurchaseInvoice } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ invoiceNo: "", firmId: state.firms[0]?.id || "", total: "", date: todayISO() });
  const [message, setMessage] = useState("");

  return (
    <div>
      <PageHeader title="Alış Faturası Oluştur" actions={<Link to="/pinvoice" className="btn btn-default">Geri</Link>} />
      {message && <div className="alert alert-info">{message}</div>}
      <form
        className="card form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          const firm = state.firms.find((f) => f.id === form.firmId);
          const ok = await runAsync(
            () =>
              addPurchaseInvoice({
                ...form,
                firmName: firm?.name || "",
                total: Number(form.total),
              }),
            setMessage
          );
          if (ok) navigate("/pinvoice");
        }}
      >
        <label>Fatura No</label>
        <input value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} required />
        <label>Firma</label>
        <select value={form.firmId} onChange={(e) => setForm({ ...form, firmId: e.target.value })}>
          {state.firms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <label>Tarih</label>
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <label>Tutar</label>
        <input type="number" step="0.01" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} required />
        <div className="form-actions">
          <button type="submit" className="btn btn-success">
            Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}
