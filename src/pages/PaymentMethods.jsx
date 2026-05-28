import { useState } from "react";
import { useStore } from "../store/StoreContext";
import DataTable from "../components/ui/DataTable";
import PageHeader from "../components/ui/PageHeader";

export default function PaymentMethods() {
  const { state, addPaymentMethod, updatePaymentMethod } = useStore();
  const [name, setName] = useState("");

  return (
    <div>
      <PageHeader title="Ödeme Tipleri" />
      <form
        className="card filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          addPaymentMethod(name.trim());
          setName("");
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
                    onClick={() => updatePaymentMethod(r.id, { active: !r.active })}
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
