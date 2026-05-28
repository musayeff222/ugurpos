import { useState } from "react";
import { useStore } from "../store/StoreContext";
import DataTable from "../components/ui/DataTable";
import PageHeader from "../components/ui/PageHeader";

export default function ProductGroups() {
  const { state, addGroup, deleteGroup } = useStore();
  const [name, setName] = useState("");

  return (
    <div>
      <PageHeader title="Ürün Grupları" />
      <form
        className="card filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          addGroup(name.trim());
          setName("");
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
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteGroup(r.id)}>
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
