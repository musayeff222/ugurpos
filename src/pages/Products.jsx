import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store/StoreContext";
import DataTable from "../components/ui/DataTable";
import PageHeader from "../components/ui/PageHeader";
import { formatMoney } from "../utils/format";
import { runAsync } from "../utils/runAsync";

export default function Products() {
  const { state, deleteProducts } = useStore();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState("");

  const rows = useMemo(() => {
    let list = [...state.products];
    if (filter === "instock") list = list.filter((p) => p.stock > 0);
    if (filter === "outstock") list = list.filter((p) => p.stock <= 0);
    if (filter === "critical") list = list.filter((p) => p.stock <= p.criticalStock);
    if (search.trim()) {
      const q = search.toLocaleLowerCase("tr");
      list = list.filter(
        (p) =>
          p.name.toLocaleLowerCase("tr").includes(q) ||
          p.barcode.includes(q) ||
          p.stockCode.toLocaleLowerCase("tr").includes(q)
      );
    }
    return list;
  }, [state.products, filter, search]);

  const toggleSelect = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div>
      <PageHeader
        title="Ürünler"
        subtitle={`${state.products.length} ürün kayıtlı`}
        actions={
          <>
            <Link to="/update" className="btn btn-success">
              <i className="fa fa-plus" /> Yeni Ürün
            </Link>
            {selected.length > 0 && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={async () => {
                  const ok = await runAsync(() => deleteProducts(selected), setMessage);
                  if (ok) setSelected([]);
                }}
              >
                Seçili ürünleri sil ({selected.length})
              </button>
            )}
          </>
        }
      />

      {message && <div className="alert alert-info">{message}</div>}

      <div className="card filter-bar">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Tüm Ürünler</option>
          <option value="instock">Stoktakiler</option>
          <option value="outstock">Stokta Olmayanlar</option>
          <option value="critical">Kritik Stok</option>
        </select>
        <input placeholder="Ürün adı, barkod, stok kodu..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              {
                key: "select",
                label: "",
                width: "40px",
                render: (r) => (
                  <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleSelect(r.id)} />
                ),
              },
              { key: "barcode", label: "Barkod" },
              { key: "name", label: "Ürün adı" },
              { key: "unit", label: "Birim", render: (r) => r.unit || "Adet" },
              { key: "stock", label: "Stok" },
              { key: "vat", label: "KDV", render: (r) => `%${r.vat}` },
              { key: "buyPrice", label: "Alış", render: (r) => formatMoney(r.buyPrice) },
              { key: "price1", label: "Fiyat 1", render: (r) => formatMoney(r.price1) },
              { key: "price2", label: "Fiyat 2", render: (r) => formatMoney(r.price2) },
              {
                key: "actions",
                label: "İşlem",
                render: (r) => (
                  <Link to={`/update?id=${r.id}`} className="btn btn-warning btn-sm">
                    Düzenle
                  </Link>
                ),
              },
            ]}
            rows={rows}
          />
        </div>
      </div>
    </div>
  );
}
