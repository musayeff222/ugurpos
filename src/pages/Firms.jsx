import { useState } from "react";
import { useStore } from "../store/StoreContext";
import DataTable from "../components/ui/DataTable";
import PageHeader from "../components/ui/PageHeader";
import { formatMoney } from "../utils/format";

export default function Firms() {
  const { state, addFirm, deleteFirm } = useStore();
  const [form, setForm] = useState({ name: "", phone: "", taxNo: "" });

  return (
    <div>
      <PageHeader title="Firmalar" />
      <form
        className="card form-inline-bar"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim()) return;
          addFirm(form);
          setForm({ name: "", phone: "", taxNo: "" });
        }}
      >
        <input placeholder="Firma adı" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input placeholder="Vergi no" value={form.taxNo} onChange={(e) => setForm({ ...form, taxNo: e.target.value })} />
        <button type="submit" className="btn btn-success">
          Ekle
        </button>
      </form>
      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: "name", label: "Firma" },
              { key: "phone", label: "Telefon" },
              { key: "taxNo", label: "Vergi No" },
              { key: "balance", label: "Bakiye", render: (r) => formatMoney(r.balance) },
              {
                key: "actions",
                label: "İşlem",
                render: (r) => (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteFirm(r.id)}>
                    Sil
                  </button>
                ),
              },
            ]}
            rows={state.firms}
          />
        </div>
      </div>
    </div>
  );
}
