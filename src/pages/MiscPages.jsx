import { useMemo, useState } from "react";
import { useStore } from "../store/StoreContext";
import PageHeader from "../components/ui/PageHeader";
import DataTable from "../components/ui/DataTable";
import { formatMoney } from "../utils/format";
import { runAsync } from "../utils/runAsync";

export default function SimpleToolPage({ title, description, children }) {
  return (
    <div>
      <PageHeader title={title} subtitle={description} />
      <div className="card">
        <div className="card-body">{children}</div>
      </div>
    </div>
  );
}

export function ProductCorrelationReport() {
  const { state } = useStore();

  const pairs = useMemo(() => {
    const map = {};
    state.sales
      .filter((s) => s.paymentType !== "refund")
      .forEach((sale) => {
        const names = sale.items.map((i) => i.name).filter(Boolean);
        for (let i = 0; i < names.length; i++) {
          for (let j = i + 1; j < names.length; j++) {
            const key = [names[i], names[j]].sort().join(" + ");
            map[key] = (map[key] || 0) + 1;
          }
        }
      });
    return Object.entries(map)
      .map(([pair, count]) => ({ id: pair, pair, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [state.sales]);

  return (
    <SimpleToolPage title="Ürün Korelasyon Raporu" description="Birlikte satılan ürünleri analiz eder.">
      {pairs.length === 0 ? (
        <p>Henüz yeterli satış verisi yok.</p>
      ) : (
        <DataTable
          columns={[
            { key: "pair", label: "Ürün Çifti" },
            { key: "count", label: "Birlikte Satış" },
          ]}
          rows={pairs}
        />
      )}
    </SimpleToolPage>
  );
}

export function VariantsPage() {
  const { state, addVariant, deleteVariant } = useStore();
  const [form, setForm] = useState({ productId: "", name: "", sku: "", price: "", stock: "" });
  const [message, setMessage] = useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.productId || !form.name) return;
    await addVariant({
      productId: form.productId,
      name: form.name,
      sku: form.sku,
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
    });
    setForm({ productId: "", name: "", sku: "", price: "", stock: "" });
  };

  return (
    <SimpleToolPage title="Ürün Varyantları" description="Renk, beden gibi varyant tanımları.">
      {message && <div className="alert alert-info">{message}</div>}
      <form className="form-inline mb-3" onSubmit={handleAdd}>
        <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required>
          <option value="">Ana ürün seçin</option>
          {state.products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input placeholder="Varyant adı" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        <input type="number" placeholder="Fiyat" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input type="number" placeholder="Stok" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        <button type="submit" className="btn btn-primary">
          Ekle
        </button>
      </form>
      <DataTable
        columns={[
          { key: "name", label: "Varyant" },
          {
            key: "productId",
            label: "Ana Ürün",
            render: (row) => state.products.find((p) => p.id === row.productId)?.name || "-",
          },
          { key: "sku", label: "SKU" },
          { key: "price", label: "Fiyat", render: (r) => formatMoney(r.price) },
          { key: "stock", label: "Stok" },
          {
            key: "actions",
            label: "",
            render: (row) => (
              <button type="button" className="btn btn-sm btn-danger" onClick={() => runAsync(() => deleteVariant(row.id), setMessage)}>
                Sil
              </button>
            ),
          },
        ]}
        rows={state.variants || []}
      />
    </SimpleToolPage>
  );
}

export function SubProductsPage() {
  const { state, addSubProduct, deleteSubProduct } = useStore();
  const [form, setForm] = useState({ parentProductId: "", name: "", qty: "1" });
  const [message, setMessage] = useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.parentProductId || !form.name) return;
    await addSubProduct({
      parentProductId: form.parentProductId,
      name: form.name,
      qty: Number(form.qty) || 1,
    });
    setForm({ parentProductId: "", name: "", qty: "1" });
  };

  return (
    <SimpleToolPage title="Alt Ürün Tanımları" description="Set / combo ürün tanımları.">
      {message && <div className="alert alert-info">{message}</div>}
      <form className="form-inline mb-3" onSubmit={handleAdd}>
        <select
          value={form.parentProductId}
          onChange={(e) => setForm({ ...form, parentProductId: e.target.value })}
          required
        >
          <option value="">Ana ürün seçin</option>
          {state.products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input placeholder="Alt ürün adı" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input type="number" placeholder="Adet" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
        <button type="submit" className="btn btn-primary">
          Ekle
        </button>
      </form>
      <DataTable
        columns={[
          {
            key: "parentProductId",
            label: "Ana Ürün",
            render: (row) => state.products.find((p) => p.id === row.parentProductId)?.name || "-",
          },
          { key: "name", label: "Alt Ürün" },
          { key: "qty", label: "Adet" },
          {
            key: "actions",
            label: "",
            render: (row) => (
              <button type="button" className="btn btn-sm btn-danger" onClick={() => runAsync(() => deleteSubProduct(row.id), setMessage)}>
                Sil
              </button>
            ),
          },
        ]}
        rows={state.subProducts || []}
      />
    </SimpleToolPage>
  );
}

export function EInvoicePage({ mode = "list" }) {
  const { state, addEInvoice } = useStore();
  const titles = {
    create: "Yeni E-Fatura Oluştur",
    outgoing: "Giden E-Faturalar",
    incoming: "Gelen E-Faturalar",
  };
  const [form, setForm] = useState({ invoiceNo: "", customerName: "", total: "" });

  const direction = mode === "incoming" ? "incoming" : "outgoing";
  const rows = (state.eInvoices || []).filter((e) => e.direction === direction);

  const handleCreate = async (e) => {
    e.preventDefault();
    await addEInvoice({
      direction: "outgoing",
      invoiceNo: form.invoiceNo,
      customerName: form.customerName,
      total: Number(form.total) || 0,
    });
    setForm({ invoiceNo: "", customerName: "", total: "" });
  };

  if (mode === "create") {
    return (
      <SimpleToolPage title={titles[mode]} description="Yeni giden e-fatura kaydı oluşturun.">
        <form className="form-grid" onSubmit={handleCreate}>
          <input placeholder="Fatura No" value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} required />
          <input placeholder="Müşteri" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          <input type="number" placeholder="Tutar" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} required />
          <button type="submit" className="btn btn-primary">
            Oluştur
          </button>
        </form>
      </SimpleToolPage>
    );
  }

  return (
    <SimpleToolPage title={titles[mode]} description={`${direction === "incoming" ? "Gelen" : "Giden"} e-fatura listesi.`}>
      <DataTable
        columns={[
          { key: "invoiceNo", label: "Fatura No" },
          { key: "customerName", label: "Müşteri" },
          { key: "total", label: "Tutar", render: (r) => formatMoney(r.total) },
          { key: "status", label: "Durum" },
          { key: "date", label: "Tarih" },
        ]}
        rows={rows}
      />
    </SimpleToolPage>
  );
}

export function LicensePage() {
  return (
    <SimpleToolPage title="Lisans Satın Al" description="BenimPOS lisans planları">
      <ul className="simple-list">
        <li>Ücretsiz masaüstü sürüm</li>
        <li>Yıllık bulut lisans</li>
        <li>Ömür boyu lisans</li>
      </ul>
      <button type="button" className="btn btn-success">
        Satın Al
      </button>
    </SimpleToolPage>
  );
}
