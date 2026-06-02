import { useState } from "react";
import { useStore } from "../store/StoreContext";
import DataTable from "../components/ui/DataTable";
import PageHeader from "../components/ui/PageHeader";
import { runAsync } from "../utils/runAsync";

export default function Tasks() {
  const { state, addTask, updateTask, deleteTask } = useStore();
  const [form, setForm] = useState({ title: "", assignee: "Admin", dueDate: "" });
  const [message, setMessage] = useState("");

  return (
    <div>
      <PageHeader title="Görev Yönetimi" />
      {message && <div className="alert alert-info">{message}</div>}
      <form
        className="card form-inline-bar"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!form.title.trim()) return;
          const ok = await runAsync(() => addTask(form), setMessage);
          if (ok) setForm({ title: "", assignee: "Admin", dueDate: "" });
        }}
      >
        <input placeholder="Görev" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input placeholder="Atanan" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} />
        <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        <button type="submit" className="btn btn-success">
          Ekle
        </button>
      </form>
      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: "title", label: "Görev" },
              { key: "assignee", label: "Atanan" },
              { key: "dueDate", label: "Bitiş" },
              {
                key: "status",
                label: "Durum",
                render: (r) => (
                  <select
                    value={r.status}
                    onChange={async (e) => {
                      await runAsync(() => updateTask(r.id, { ...r, status: e.target.value }), setMessage);
                    }}
                  >
                    <option value="open">Açık</option>
                    <option value="done">Tamamlandı</option>
                  </select>
                ),
              },
              {
                key: "actions",
                label: "İşlem",
                render: (r) => (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => runAsync(() => deleteTask(r.id), setMessage)}>
                    Sil
                  </button>
                ),
              },
            ]}
            rows={state.tasks}
          />
        </div>
      </div>
    </div>
  );
}
