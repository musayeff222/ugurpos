import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import ProductImageField from "../../components/ProductImageField";
import { DEFAULT_PRODUCT_UNIT, PRODUCT_UNITS } from "../../data/productUnits";
import { formatMoney } from "../../utils/format";
import { getProductImageSrc } from "../../utils/productImage";

const emptyForm = {
  name: "",
  groupId: "",
  unit: DEFAULT_PRODUCT_UNIT,
  vat: 20,
  buyPrice: 0,
  price1: 0,
  price2: 0,
  onSalePage: true,
};

export default function AdminCatalog() {
  const [tab, setTab] = useState("products");
  const [groups, setGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [groupName, setGroupName] = useState("");
  const [editingGroup, setEditingGroup] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [imageValue, setImageValue] = useState(undefined);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const load = async () => {
    const [g, p] = await Promise.all([api.getAdminCatalogGroups(), api.getAdminCatalogProducts()]);
    setGroups(g);
    setProducts(p);
    setForm((prev) => (prev.groupId || !g[0] ? prev : { ...prev, groupId: g[0].id }));
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        String(p.groupName || "").toLowerCase().includes(term) ||
        String(p.barcode || "").includes(term)
    );
  }, [products, query]);

  const editing = products.find((p) => p.id === editId);

  const persistImage = async (productId) => {
    if (imageValue === undefined) return;
    if (imageValue === null) {
      await api.updateAdminCatalogProduct(productId, { removeImage: true });
      return;
    }
    if (imageValue.file) {
      await api.uploadAdminCatalogImage(productId, imageValue.file);
      return;
    }
    if (imageValue.data && imageValue.mime) {
      await api.updateAdminCatalogProduct(productId, {
        imageData: imageValue.data,
        imageMime: imageValue.mime,
      });
    }
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!form.name.trim()) {
      setError("Ürün adı zorunludur.");
      return;
    }
    if (!form.groupId) {
      setError("Önce bir grup oluşturun ve seçin.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        groupId: form.groupId,
        unit: form.unit,
        vat: Number(form.vat) || 0,
        buyPrice: Number(form.buyPrice) || 0,
        price1: Number(form.price1) || 0,
        price2: Number(form.price2) || 0,
        onSalePage: !!form.onSalePage,
      };
      const saved = editId
        ? await api.updateAdminCatalogProduct(editId, payload)
        : await api.createAdminCatalogProduct(payload);
      await persistImage(saved.id);
      await load();
      setEditId(null);
      setForm({ ...emptyForm, groupId: form.groupId });
      setImageValue(undefined);
      setMessage(editId ? "Ürün güncellendi. Tüm şubelerde fiyat ve grup yenilendi." : "Ürün tüm şubelere eklendi. Stok her şubede 0.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (product) => {
    setTab("products");
    setEditId(product.id);
    setForm({
      name: product.name,
      groupId: product.groupId,
      unit: product.unit || DEFAULT_PRODUCT_UNIT,
      vat: product.vat,
      buyPrice: product.buyPrice,
      price1: product.price1,
      price2: product.price2,
      onSalePage: product.onSalePage !== false,
    });
    setImageValue(undefined);
    setMessage("");
  };

  const saveGroup = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!groupName.trim()) return;
    try {
      if (editingGroup) {
        await api.updateAdminCatalogGroup(editingGroup, groupName.trim());
      } else {
        await api.createAdminCatalogGroup(groupName.trim());
      }
      setGroupName("");
      setEditingGroup(null);
      await load();
      setMessage("Grup kaydedildi. Şubelerde bu isimle görünür.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page erp-page">
      <div className="crm-listbar">
        <div>
          <h2>Ürünler</h2>
          <span>Merkez katalog · fiyat burada · stok şubede</span>
        </div>
        <div className="crm-listbar__tools">
          <form className="crm-global-search crm-global-search--inline" onSubmit={(e) => e.preventDefault()}>
            <i className="fa fa-search" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ürün veya grup..." />
          </form>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}

      <ul className="admin-tabs erp-tabs">
        <li>
          <button type="button" className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>
            Katalog
          </button>
        </li>
        <li>
          <button type="button" className={tab === "groups" ? "active" : ""} onClick={() => setTab("groups")}>
            Gruplar
          </button>
        </li>
      </ul>

      {tab === "groups" && (
        <section className="erp-panel">
          <form className="erp-form" onSubmit={saveGroup}>
            <div className="erp-form-grid">
              <label className="erp-field erp-field--full">
                <span>{editingGroup ? "Grup adını düzenle" : "Yeni grup"}</span>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Örn: Sular"
                  required
                />
              </label>
            </div>
            <div className="form-actions">
              {editingGroup && (
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => {
                    setEditingGroup(null);
                    setGroupName("");
                  }}
                >
                  Vazgeç
                </button>
              )}
              <button type="submit" className="btn btn-primary">
                {editingGroup ? "Güncelle" : "Grup oluştur"}
              </button>
            </div>
          </form>
          <table className="erp-table">
            <thead>
              <tr>
                <th>Grup</th>
                <th>Ürün</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id}>
                  <td>
                    <strong>{g.name}</strong>
                  </td>
                  <td>{products.filter((p) => p.groupId === g.id).length}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-default btn-sm"
                      onClick={() => {
                        setEditingGroup(g.id);
                        setGroupName(g.name);
                      }}
                    >
                      Düzenle
                    </button>{" "}
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={async () => {
                        try {
                          await api.deleteAdminCatalogGroup(g.id);
                          await load();
                        } catch (err) {
                          setError(err.message);
                        }
                      }}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={3} className="erp-table__empty">
                    Henüz grup yok. Örn: Sular
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {tab === "products" && (
        <div className="erp-split">
          <section className="erp-panel erp-panel--flush">
            <div className="admin-table-wrap">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Grup</th>
                    <th>Fiyat</th>
                    <th>Durum</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className="crm-account">
                          {p.hasImage ? (
                            <img className="crm-avatar" src={getProductImageSrc(p)} alt="" />
                          ) : (
                            <span className="crm-avatar">{p.name.slice(0, 2).toUpperCase()}</span>
                          )}
                          <span>
                            <strong>{p.name}</strong>
                            <small>{p.barcode}</small>
                          </span>
                        </span>
                      </td>
                      <td>{p.groupName || "—"}</td>
                      <td>{formatMoney(p.price1 || 0)}</td>
                      <td>
                        <span className={`admin-badge ${p.active ? "ok" : "off"}`}>
                          {p.active ? "Aktif" : "Pasif"}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="btn btn-default btn-sm" onClick={() => startEdit(p)}>
                          Aç
                        </button>{" "}
                        <button
                          type="button"
                          className="btn btn-warning btn-sm"
                          onClick={async () => {
                            await api.deleteAdminCatalogProduct(p.id);
                            await load();
                          }}
                        >
                          Pasif
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="erp-table__empty">
                        Katalog boş. Sağdaki formdan ürün ekleyin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <form className="erp-panel erp-form" onSubmit={saveProduct}>
            <header className="erp-panel__head">
              <h3>{editId ? "Ürünü düzenle" : "Yeni ürün"}</h3>
            </header>
            <label className="erp-field">
              <span>Resim</span>
              <ProductImageField
                product={editing ? { ...editing, imageUrl: getProductImageSrc(editing) } : null}
                value={imageValue}
                onChange={setImageValue}
              />
            </label>
            <label className="erp-field">
              <span>Ürün adı *</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="erp-field">
              <span>Grup *</span>
              <select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })} required>
                <option value="">Seçin</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="erp-field">
              <span>Satış fiyatı *</span>
              <input
                type="number"
                step="0.01"
                value={form.price1}
                onChange={(e) => setForm({ ...form, price1: e.target.value })}
              />
            </label>
            <label className="erp-field">
              <span>Fiyat 2</span>
              <input
                type="number"
                step="0.01"
                value={form.price2}
                onChange={(e) => setForm({ ...form, price2: e.target.value })}
              />
            </label>
            <label className="erp-field">
              <span>Alış</span>
              <input
                type="number"
                step="0.01"
                value={form.buyPrice}
                onChange={(e) => setForm({ ...form, buyPrice: e.target.value })}
              />
            </label>
            <label className="erp-field">
              <span>KDV %</span>
              <input type="number" value={form.vat} onChange={(e) => setForm({ ...form, vat: e.target.value })} />
            </label>
            <label className="erp-field">
              <span>Birim</span>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {PRODUCT_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.onSalePage}
                onChange={(e) => setForm({ ...form, onSalePage: e.target.checked })}
              />
              Satış ve QR menüde göster
            </label>
            <div className="form-actions">
              {editId && (
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => {
                    setEditId(null);
                    setForm({ ...emptyForm, groupId: groups[0]?.id || "" });
                    setImageValue(undefined);
                  }}
                >
                  Yeni
                </button>
              )}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Kaydediliyor..." : editId ? "Tüm şubelere uygula" : "Kataloga ekle"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
