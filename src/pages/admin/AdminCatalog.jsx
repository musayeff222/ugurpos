import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import ProductImageField from "../../components/ProductImageField";
import { DEFAULT_PRODUCT_UNIT } from "../../data/productUnits";
import { formatMoney } from "../../utils/format";
import { getProductImageSrc } from "../../utils/productImage";

const emptyForm = {
  name: "",
  groupId: "",
  newGroup: "",
  price1: "",
  branchIds: [],
};

export default function AdminCatalog() {
  const [view, setView] = useState("list");
  const [groups, setGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [imageValue, setImageValue] = useState(undefined);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const salesBranches = branches.filter((branch) => branch.kind !== "production");

  const load = async () => {
    const [g, p, branchList] = await Promise.all([
      api.getAdminCatalogGroups(),
      api.getAdminCatalogProducts(),
      api.getAdminBranches(),
    ]);
    setGroups(g);
    setProducts(p.filter((item) => item.active !== false));
    setBranches(branchList || []);
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
        String(p.groupName || "").toLowerCase().includes(term)
    );
  }, [products, query]);

  const grouped = useMemo(() => {
    const buckets = new Map();
    for (const group of groups) {
      buckets.set(group.id, { id: group.id, name: group.name, items: [] });
    }
    const uncategorized = { id: "", name: "Kategori yok", items: [] };
    for (const product of filtered) {
      const bucket = product.groupId ? buckets.get(product.groupId) : null;
      if (bucket) bucket.items.push(product);
      else uncategorized.items.push(product);
    }
    const sections = [...buckets.values()].filter((section) => section.items.length);
    if (uncategorized.items.length) sections.push(uncategorized);
    return sections;
  }, [filtered, groups]);

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

  const openCreate = () => {
    setEditId(null);
    setForm({
      ...emptyForm,
      groupId: groups[0]?.id || "",
      branchIds: salesBranches.map((branch) => branch.id),
    });
    setImageValue(undefined);
    setShowNewGroup(false);
    setError("");
    setMessage("");
    setView("form");
  };

  const openEdit = (product) => {
    setEditId(product.id);
    setForm({
      name: product.name,
      groupId: product.groupId || "",
      newGroup: "",
      price1: product.price1 ?? "",
      branchIds: product.branchIds || [],
    });
    setImageValue(undefined);
    setShowNewGroup(false);
    setError("");
    setMessage("");
    setView("form");
  };

  const openGroups = () => {
    setGroupName("");
    setError("");
    setMessage("");
    setView("groups");
  };

  const backToList = () => {
    setView("list");
    setEditId(null);
    setImageValue(undefined);
    setError("");
  };

  const createGroup = async (name) => {
    const label = String(name || "").trim();
    if (!label) {
      setError("Kategori adı zorunludur.");
      return null;
    }
    setCreatingGroup(true);
    setError("");
    try {
      const created = await api.createAdminCatalogGroup(label);
      const nextGroups = await api.getAdminCatalogGroups();
      setGroups(nextGroups);
      setMessage("Kategori oluşturuldu.");
      return created;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setCreatingGroup(false);
    }
  };

  const saveGroup = async (e) => {
    e.preventDefault();
    const created = await createGroup(groupName);
    if (!created) return;
    setGroupName("");
  };

  const removeGroup = async (group) => {
    const count = products.filter((product) => product.groupId === group.id).length;
    const note = count ? ` Bu kategorideki ${count} ürün kategorisiz kalacak.` : "";
    if (!window.confirm(`"${group.name}" silinsin?${note}`)) return;
    setError("");
    try {
      await api.deleteAdminCatalogGroup(group.id);
      setGroups((prev) => prev.filter((item) => item.id !== group.id));
      setProducts((prev) =>
        prev.map((product) =>
          product.groupId === group.id ? { ...product, groupId: "", groupName: "" } : product
        )
      );
      setMessage("Kategori silindi.");
    } catch (err) {
      setError(err.message);
    }
  };

  const createGroupFromProduct = async () => {
    const created = await createGroup(form.newGroup);
    if (!created) return;
    setForm((prev) => ({ ...prev, groupId: created.id, newGroup: "" }));
    setShowNewGroup(false);
  };

  const resolveGroupId = async () => {
    const named = form.newGroup.trim();
    if (named) {
      const created = await api.createAdminCatalogGroup(named);
      return created.id;
    }
    return form.groupId;
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!form.name.trim()) {
      setError("Ürün adı zorunludur.");
      return;
    }
    if (!form.groupId && !form.newGroup.trim()) {
      setError("Kategori seçin.");
      return;
    }
    setSaving(true);
    try {
      const groupId = await resolveGroupId();
      const price = Number(form.price1) || 0;
      const payload = {
        name: form.name.trim(),
        groupId,
        unit: editing?.unit || DEFAULT_PRODUCT_UNIT,
        vat: editing?.vat ?? 0,
        buyPrice: editing?.buyPrice ?? 0,
        price1: price,
        price2: editing?.price2 ?? price,
        onSalePage: editing ? editing.onSalePage !== false : true,
        branchIds: form.branchIds,
      };
      const saved = editId
        ? await api.updateAdminCatalogProduct(editId, payload)
        : await api.createAdminCatalogProduct(payload);
      await persistImage(saved.id);
      await load();
      setView("list");
      setEditId(null);
      setImageValue(undefined);
      setMessage(editId ? "Ürün güncellendi." : "Ürün oluşturuldu.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (product) => {
    if (!window.confirm(`"${product.name}" silinsin?`)) return;
    setError("");
    try {
      await api.deleteAdminCatalogProduct(product.id);
      await load();
      setMessage("Ürün silindi.");
    } catch (err) {
      setError(err.message);
    }
  };

  if (view === "groups") {
    return (
      <div className="admin-page erp-page">
        <div className="crm-listbar">
          <div>
            <button type="button" className="catalog-back" onClick={backToList}>
              <i className="fa fa-arrow-left" aria-hidden /> Listeye dön
            </button>
            <h2>Kategori oluştur</h2>
          </div>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-info">{message}</div>}
        <form className="catalog-form" onSubmit={saveGroup}>
          <label className="erp-field">
            <span>Kategori adı *</span>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Örn. İçecek"
              required
            />
          </label>
          <div className="form-actions">
            <button type="button" className="btn btn-default" onClick={backToList}>
              Vazgeç
            </button>
            <button type="submit" className="btn btn-primary" disabled={creatingGroup}>
              {creatingGroup ? "Kaydediliyor..." : "Kategori oluştur"}
            </button>
          </div>
          <ul className="catalog-group-list">
            {groups.map((group) => (
              <li key={group.id}>
                <span>{group.name}</span>
                <button type="button" title="Sil" onClick={() => removeGroup(group)}>
                  <i className="fa fa-trash" aria-hidden />
                </button>
              </li>
            ))}
            {!groups.length && <li>Henüz kategori yok.</li>}
          </ul>
        </form>
      </div>
    );
  }

  if (view === "form") {
    return (
      <div className="admin-page erp-page">
        <div className="crm-listbar">
          <div>
            <button type="button" className="catalog-back" onClick={backToList}>
              <i className="fa fa-arrow-left" aria-hidden /> Listeye dön
            </button>
            <h2>{editId ? "Ürünü düzenle" : "Yeni ürün oluştur"}</h2>
          </div>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <form className="catalog-form" onSubmit={saveProduct}>
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
            <span>Fiyat *</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.price1}
              onChange={(e) => setForm({ ...form, price1: e.target.value })}
              required
            />
          </label>
          <div className="catalog-category">
            <label className="erp-field">
              <span>Kategori *</span>
              <select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
                <option value="">Seçin</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn btn-default" onClick={() => setShowNewGroup((open) => !open)}>
              Kategori oluştur
            </button>
          </div>
          {showNewGroup && (
            <div className="catalog-category-create">
              <input
                value={form.newGroup}
                onChange={(e) => setForm({ ...form, newGroup: e.target.value })}
                placeholder="Yeni kategori adı"
              />
              <button type="button" className="btn btn-primary" disabled={creatingGroup} onClick={createGroupFromProduct}>
                {creatingGroup ? "..." : "Oluştur"}
              </button>
            </div>
          )}
          <fieldset className="catalog-branches">
            <legend>Görüneceği şubeler</legend>
            {salesBranches.map((branch) => (
              <label key={branch.id}>
                <input
                  type="checkbox"
                  checked={form.branchIds.includes(branch.id)}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      branchIds: e.target.checked
                        ? [...prev.branchIds, branch.id]
                        : prev.branchIds.filter((id) => id !== branch.id),
                    }))
                  }
                />
                {branch.name}
              </label>
            ))}
            {!salesBranches.length && <p>Satış şubesi yok.</p>}
          </fieldset>
          <div className="form-actions">
            <button type="button" className="btn btn-default" onClick={backToList}>
              Vazgeç
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Kaydediliyor..." : editId ? "Güncelle" : "Ürün oluştur"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-page erp-page">
      <div className="crm-listbar">
        <div>
          <h2>Ürünler</h2>
          <span>{filtered.length} ürün</span>
        </div>
        <div className="crm-listbar__tools">
          <form className="crm-global-search crm-global-search--inline" onSubmit={(e) => e.preventDefault()}>
            <i className="fa fa-search" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ürün veya kategori..." />
          </form>
          <button type="button" className="btn btn-default" onClick={openGroups}>
            Kategori oluştur
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Yeni ürün oluştur
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}

      <div className="catalog-groups">
        {grouped.map((section) => (
          <section key={section.id || "none"} className="catalog-group">
            <h3>
              {section.name} <span>{section.items.length}</span>
            </h3>
            <div className="catalog-grid">
              {section.items.map((p) => (
                <article key={p.id} className="catalog-card">
                  <div className="catalog-card__media">
                    {p.hasImage ? (
                      <img src={getProductImageSrc(p)} alt="" />
                    ) : (
                      <span>{p.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="catalog-card__body">
                    <strong>{p.name}</strong>
                    <small>
                      {(p.branchIds || [])
                        .map((id) => salesBranches.find((branch) => branch.id === id)?.name)
                        .filter(Boolean)
                        .join(", ") || "Şube seçilmedi"}
                    </small>
                    <b>{formatMoney(p.price1 || 0)}</b>
                  </div>
                  <div className="catalog-card__actions">
                    <button type="button" title="Düzenle" onClick={() => openEdit(p)}>
                      <i className="fa fa-pencil" aria-hidden />
                    </button>
                    <button type="button" title="Sil" className="is-danger" onClick={() => removeProduct(p)}>
                      <i className="fa fa-trash" aria-hidden />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      {!filtered.length && <p className="catalog-empty">Henüz ürün yok. Yeni ürün oluştur düğmesine basın.</p>}
    </div>
  );
}
