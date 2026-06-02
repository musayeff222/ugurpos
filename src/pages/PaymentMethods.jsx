import { useState } from "react";
import { useStore } from "../store/StoreContext";
import DataTable from "../components/ui/DataTable";
import PageHeader from "../components/ui/PageHeader";
import { runAsync } from "../utils/runAsync";

export default function PaymentMethods() {
  const { state, addPaymentMethod, updatePaymentMethod } = useStore();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  return (
    <div>
      <PageHeader title="Ödeme Tipleri" />
      {message && <div className="alert alert-info">{message}</div>}
      <form
        className="card filter-bar"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const ok = await runAsync(() => addPaymentMethod(name.trim()), setMessage);
          if (ok) setName("");
        }}
      >
        <input placeholder="Yeni ödeme tipi" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="btn btn-success">
          Ekle
        </button>
      </form>
      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: "name", label: "Ödeme tipi" },
              {
                key: "active",
                label: "Durum",
                render: (r) => (
                  <button
                    type="button"
                    className={`btn btn-sm ${r.active ? "btn-success" : "btn-default"}`}
                    onClick={() => runAsync(() => updatePaymentMethod(r.id, { name: r.name, active: !r.active }), setMessage)}
                  >
                    {r.active ? "Aktif" : "Pasif"}
                  </button>
                ),
              },
            ]}
            rows={state.paymentMethods}
          />
        </div>
      </div>
    </div>
  );
}
