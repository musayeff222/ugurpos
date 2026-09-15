import { useEffect, useState } from "react";
import { api } from "../../api/client";
import Modal from "../../components/ui/Modal";
import { formatDateTime } from "../../utils/format";

export default function ProductionProducts() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [createName, setCreateName] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [history, setHistory] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setProducts(await api.getProductionProducts());
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createProductionProduct({ name: createName.trim() });
      setCreateName("");
      setCreateOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (product) => {
    try {
      setHistory(await api.getProductionProductHistory(product.id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="prod-page">
      <div className="prod-hero">
        <div>
          <p className="prod-kicker">Kataloq</p>
          <h1>Hazırlanan məhsullar</h1>
          <span>Çiy köftə, pizza, burger və s.</span>
        </div>
        <button type="button" className="prod-btn prod-btn--primary" onClick={() => setCreateOpen(true)}>
          + Yeni hazırlanan məhsul
        </button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="prod-product-grid">
        {products.map((item) => (
          <article key={item.id} className="prod-product-card">
            <h3>{item.name}</h3>
            <button type="button" className="prod-icon" title="Hazırlanma tarixçəsi" onClick={() => openHistory(item)}>
              <i className="fa fa-eye" aria-hidden />
            </button>
          </article>
        ))}
        {!products.length && <p className="prod-empty">Hələ məhsul yoxdur. İstifadə zamanı da yarada bilərsiniz.</p>}
      </div>

      <Modal open={createOpen} title="Yeni hazırlanan məhsul" onClose={() => setCreateOpen(false)}>
        <form className="erp-form" onSubmit={create}>
          <label className="erp-field">
            <span>Məhsul adı *</span>
            <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Çiy köftə" required />
          </label>
          <div className="form-actions">
            <button type="submit" className="prod-btn prod-btn--primary" disabled={saving}>
              Yarat
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!history}
        title={history ? `${history.product.name} — hazırlanma tarixçəsi` : "Tarixçə"}
        onClose={() => setHistory(null)}
      >
        {history?.batches?.length ? (
          <div className="prod-history">
            {history.batches.map((batch) => (
              <article key={batch.id}>
                <strong>{batch.createdAt ? formatDateTime(batch.createdAt, "az") : "—"}</strong>
                <ul>
                  {(batch.items || []).map((item) => (
                    <li key={item.id}>
                      {item.rawMaterialName} — {item.qty}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        ) : (
          <p className="prod-empty">Bu məhsul hələ hazırlanmayıb.</p>
        )}
      </Modal>
    </div>
  );
}
