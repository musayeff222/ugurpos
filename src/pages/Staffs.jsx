import { useState } from "react";
import { useStore } from "../store/StoreContext";
import DataTable from "../components/ui/DataTable";
import PageHeader from "../components/ui/PageHeader";
import { runAsync } from "../utils/runAsync";

export default function Staffs() {
  const { state, addStaff, updateStaff, deleteStaff } = useStore();
  const [form, setForm] = useState({
    name: "",
    surname: "",
    login: "",
    password: "",
    role: "Kasiyer",
    canCashExpense: true,
  });
  const [message, setMessage] = useState("");

  return (
    <div>
      <PageHeader title="Personeller" />
      {message && <div className="alert alert-info">{message}</div>}
      <form
        className="card form-inline-bar"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!form.name.trim() || !form.login.trim() || !form.password.trim()) {
            setMessage("Ad, login ve giriş şifresi gerekli.");
            return;
          }
          const ok = await runAsync(() => addStaff(form), setMessage);
          if (ok) {
            setForm({
              name: "",
              surname: "",
              login: "",
              password: "",
              role: "Kasiyer",
              canCashExpense: true,
            });
          }
        }}
      >
        <input placeholder="Ad" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Soyad" value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} />
        <input placeholder="Login" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
        <input
          type="password"
          placeholder="Giriş şifresi"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option>Kasiyer</option>
          <option>Garson</option>
          <option>Admin</option>
        </select>
        <label className="checkbox-inline">
          <input
            type="checkbox"
            checked={form.canCashExpense}
            onChange={(e) => setForm({ ...form, canCashExpense: e.target.checked })}
          />
          Kassadan xərc
        </label>
        <button type="submit" className="btn btn-success">
          Ekle
        </button>
      </form>
      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: "name", label: "Ad" },
              { key: "surname", label: "Soyad" },
              { key: "login", label: "Login" },
              { key: "role", label: "Yetki" },
              {
                key: "canCashExpense",
                label: "Kassadan xərc",
                render: (r) => (
                  <input
                    type="checkbox"
                    checked={!!r.canCashExpense}
                    onChange={() =>
                      runAsync(
                        () => updateStaff(r.id, { canCashExpense: !r.canCashExpense }),
                        setMessage
                      )
                    }
                  />
                ),
              },
              { key: "hasPassword", label: "Şifre", render: (r) => (r.hasPassword ? "Var" : "Yok") },
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
