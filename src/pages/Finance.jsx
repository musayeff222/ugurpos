import { useState } from "react";
import { useStore } from "../store/StoreContext";
import DataTable from "../components/ui/DataTable";
import PageHeader from "../components/ui/PageHeader";
import { formatMoney, todayISO } from "../utils/format";

function FinancePage({ title, type }) {
  const store = useStore();
  const isIncome = type === "income";
  const list = isIncome ? store.state.income : store.state.expense;
  const types = isIncome ? store.state.incomeTypes : store.state.expenseTypes;
  const addFn = isIncome ? store.addIncome : store.addExpense;
  const [form, setForm] = useState({ title: "", amount: "", typeId: types[0]?.id || "", date: todayISO() });

  return (
    <div>
      <PageHeader title={title} />
      <form
        className="card form-inline-bar"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title.trim() || !form.amount) return;
          addFn({
            title: form.title,
            amount: form.amount,
            typeId: form.typeId,
            date: form.date,
          });
          setForm({ title: "", amount: "", typeId: types[0]?.id || "", date: todayISO() });
        }}
      >
        <input placeholder="Açıklama" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input type="number" step="0.01" placeholder="Tutar" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <select value={form.typeId} onChange={(e) => setForm({ ...form, typeId: e.target.value })}>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <button type="submit" className="btn btn-success">
          Kaydet
        </button>
      </form>
      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: "date", label: "Tarih" },
              { key: "title", label: "Açıklama" },
              {
                key: "typeId",
                label: "Tür",
                render: (r) => types.find((t) => t.id === r.typeId)?.name || "—",
              },
              { key: "amount", label: "Tutar", render: (r) => formatMoney(r.amount) },
            ]}
            rows={list}
          />
        </div>
      </div>
    </div>
  );
}

export function IncomePage() {
  return <FinancePage title="Gelirler" type="income" />;
}

export function ExpensePage() {
  return <FinancePage title="Giderler" type="expense" />;
}

export function IneTypesPage() {
  const { state, addIncomeType, addExpenseType } = useStore();
  const [incomeName, setIncomeName] = useState("");
  const [expenseName, setExpenseName] = useState("");

  return (
    <div>
      <PageHeader title="Gelir / Gider Türleri" />
      <div className="row">
        <div className="col half-col">
          <div className="card">
            <div className="card-header">
              <h5>Gelir Türleri</h5>
            </div>
            <form
              className="card-body filter-bar"
              onSubmit={(e) => {
                e.preventDefault();
                if (!incomeName.trim()) return;
                addIncomeType(incomeName.trim());
                setIncomeName("");
              }}
            >
              <input value={incomeName} onChange={(e) => setIncomeName(e.target.value)} placeholder="Yeni gelir türü" />
              <button type="submit" className="btn btn-success btn-sm">
                Ekle
              </button>
            </form>
            <ul className="simple-list">
              {state.incomeTypes.map((t) => (
                <li key={t.id}>{t.name}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="col half-col">
          <div className="card">
            <div className="card-header">
              <h5>Gider Türleri</h5>
            </div>
            <form
              className="card-body filter-bar"
              onSubmit={(e) => {
                e.preventDefault();
                if (!expenseName.trim()) return;
                addExpenseType(expenseName.trim());
                setExpenseName("");
              }}
            >
              <input value={expenseName} onChange={(e) => setExpenseName(e.target.value)} placeholder="Yeni gider türü" />
              <button type="submit" className="btn btn-success btn-sm">
                Ekle
              </button>
            </form>
            <ul className="simple-list">
              {state.expenseTypes.map((t) => (
                <li key={t.id}>{t.name}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
