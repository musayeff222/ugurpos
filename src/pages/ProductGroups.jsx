import { useState } from "react";
import { useStore } from "../store/StoreContext";
import DataTable from "../components/ui/DataTable";
import PageHeader from "../components/ui/PageHeader";
import { runAsync } from "../utils/runAsync";

export default function ProductGroups() {
  const { state, addGroup, deleteGroup } = useStore();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const quickGroups = ["Yiyecekler", "İçecekler", "Tatlılar", "Çiğköfte", "Diğer"];

  const createIfMissing = async (groupName) => {
    const exists = state.groups.some((g) => g.name.toLocaleLowerCase("tr") === groupName.toLocaleLowerCase("tr"));
    if (exists) {
      setMessage(`"${groupName}" artıq mövcuddur.`);
      return;
    }
    await runAsync(() => addGroup(groupName), setMessage);
  };

  return (
    <div>
      <PageHeader title="Məhsul Kateqoriyaları" subtitle="Satış ekranında qrup tabları buradan gəlir" />
      {message && <div className="alert alert-info">{message}</div>}

      <div className="card filter-bar">
        <span className="hint-text" style={{ margin: 0 }}>
          Tez əlavə:
        </span>
        {quickGroups.map((groupName) => (
          <button key={groupName} type="button" className="btn btn-default btn-sm" onClick={() => createIfMissing(groupName)}>
            + {groupName}
          </button>
        ))}
      </div>

      <form
        className="card filter-bar"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const ok = await runAsync(() => addGroup(name.trim()), setMessage);
          if (ok) setName("");
        }}
      >
        <input placeholder="Yeni kateqoriya adı" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="btn btn-success">
          Kateqoriya əlavə et
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
