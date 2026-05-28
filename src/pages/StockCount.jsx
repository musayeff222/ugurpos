import { useState } from "react";
import { useStore } from "../store/StoreContext";
import DataTable from "../components/ui/DataTable";
import PageHeader from "../components/ui/PageHeader";
import { todayISO } from "../utils/format";

export default function StockCount() {
  const { state, addStockCount, updateProduct } = useStore();
  const [form, setForm] = useState({ productId: state.products[0]?.id || "", counted: "", note: "" });

  const submit = (e) => {
    e.preventDefault();
    const product = state.products.find((p) => p.id === form.productId);
    if (!product) return;
    const counted = Number(form.counted);
    addStockCount({
      productId: product.id,
      productName: product.name,
      previous: product.stock,
      counted,
      difference: counted - product.stock,
      note: form.note,
      date: todayISO(),
    });
    updateProduct(product.id, { stock: counted });
    setForm({ ...form, counted: "", note: "" });
  };

  return (
    <div>
      <PageHeader title="Stok Sayımları" />
      <form className="card form-inline-bar" onSubmit={submit}>
        <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
          {state.products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (mevcut: {p.stock})
            </option>
          ))}
        </select>
        <input type="number" placeholder="Sayım sonucu" value={form.counted} onChange={(e) => setForm({ ...form, counted: e.target.value })} />
        <input placeholder="Not" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <button type="submit" className="btn btn-success">
          Sayım Kaydet
        </button>
      </form>
      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: "date", label: "Tarih" },
              { key: "productName", label: "Ürün" },
              { key: "previous", label: "Önceki" },
              { key: "counted", label: "Sayım" },
              { key: "difference", label: "Fark" },
              { key: "note", label: "Not" },
            ]}
            rows={state.stockCounts}
          />
        </div>
      </div>
    </div>
  );
}
