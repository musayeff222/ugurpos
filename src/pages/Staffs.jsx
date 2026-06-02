import { useState } from "react";
import { useStore } from "../store/StoreContext";
import DataTable from "../components/ui/DataTable";
import PageHeader from "../components/ui/PageHeader";
import { runAsync } from "../utils/runAsync";

export default function Staffs() {
  const { state, addStaff, deleteStaff } = useStore();
  const [form, setForm] = useState({ name: "", code: "", role: "Kasiyer" });
  const [message, setMessage] = useState("");

  return (
    <div>
      <PageHeader title="Personeller" />
      {message && <div className="alert alert-info">{message}</div>}
      <form
        className="card form-inline-bar"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!form.name.trim()) return;
          const ok = await runAsync(() => addStaff(form), setMessage);
          if (ok) setForm({ name: "", code: "", role: "Kasiyer" });
        }}
      >
        <input placeholder="Ad" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Kod" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option>Kasiyer</option>
          <option>Yönetici</option>
        </select>
        <button type="submit" className="btn btn-success">
          Ekle
        </button>
      </form>
      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: "name", label: "Personel" },
              { key: "code", label: "Kod" },
              { key: "role", label: "Rol" },
              {
                key: "actions",
                label: "İşlem",
                render: (r) => (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => runAsync(() => deleteStaff(r.id), setMessage)}>
                    Sil
                  </button>
                ),
              },
            ]}
            rows={state.staff}
          />
        </div>
      </div>
    </div>
  );
}
