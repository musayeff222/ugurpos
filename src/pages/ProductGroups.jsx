import { useState } from "react";
import { useStore } from "../store/StoreContext";
import DataTable from "../components/ui/DataTable";
import PageHeader from "../components/ui/PageHeader";
import { runAsync } from "../utils/runAsync";

export default function ProductGroups() {
  const { state, addGroup, deleteGroup } = useStore();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  return (
    <div>
      <PageHeader title="Ürün Grupları" />
      {message && <div className="alert alert-info">{message}</div>}
      <form
        className="card filter-bar"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const ok = await runAsync(() => addGroup(name.trim()), setMessage);
          if (ok) setName("");
        }}
      >
        <input placeholder="Yeni grup adı" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="btn btn-success">
          Ekle
        </button>
      </form>
      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: "name", label: "Grup adı" },
              {
                key: "actions",
                label: "İşlem",
                render: (r) => (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => runAsync(() => deleteGroup(r.id), setMessage)}>
                    Sil
                  </button>
                ),
              },
            ]}
            rows={state.groups}
          />
        </div>
      </div>
    </div>
  );
}
