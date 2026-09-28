import { useEffect, useState } from "react";
import { api } from "../../api/client";
import Modal from "../../components/ui/Modal";

export default function ProductionBranches() {
  const [branches, setBranches] = useState([]);
  const [readyProducts, setReadyProducts] = useState([]);
  const [branchStocks, setBranchStocks] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [transfer, setTransfer] = useState(null);
  const [grams, setGrams] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const data = await api.getProductionSalesBranches();
    setBranches(data.branches || []);
    setReadyProducts(data.readyProducts || []);
    setBranchStocks(data.branchStocks || {});
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const openTransfer = (branch, product) => {
    setTransfer({ branch, product });
    setGrams("");
    setError("");
  };

  const submitTransfer = async (e) => {
    e.preventDefault();
    if (!transfer) return;
    setSaving(true);
    setError("");
    try {
      const result = await api.transferProductionProduct({
        productId: transfer.product.id,
        targetBranchId: transfer.branch.id,
        qtyGrams: Number(grams),
      });
      setMessage(
        `${result.qtyGrams} qram ${result.productName} → ${result.targetBranchName}. Şubə stoku: ${result.targetStockAfter} qram.`
      );
      setTransfer(null);
      setGrams("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="prod-page">
      <div className="prod-hero">
        <div>
          <p className="prod-kicker">Göndərmə</p>
          <h1>Şubələr</h1>
          <span>Hazır məhsulu şubəyə qramla göndərin</span>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}

      {!readyProducts.length && <p className="prod-empty">Göndərmək üçün əvvəl “İstifadəyə hazır” stoku yaradın.</p>}

      <div className="prod-branch-list">
        {branches.map((branch) => (
          <section key={branch.id} className="prod-panel">
            <header className="prod-panel__head">
              <h3>{branch.name}</h3>
              {branch.branchNo ? <small>#{branch.branchNo}</small> : null}
            </header>
            <div className="prod-transfer-grid">
              {readyProducts.map((product) => {
                const stock = branchStocks?.[branch.id]?.[product.id]?.stockGrams || 0;
                return (
                  <article key={product.id} className="prod-transfer-card">
                    <div>
                      <strong>
                        <em>{product.readyStock} qram</em> {product.name}
                      </strong>
                      <small>Şubədə indi: {stock} qram</small>
                    </div>
                    <button type="button" className="prod-btn prod-btn--primary prod-btn--sm" onClick={() => openTransfer(branch, product)}>
                      Göndər
                    </button>
                  </article>
                );
              })}
              {!readyProducts.length && <p className="prod-empty">Hazır stok yoxdur.</p>}
            </div>
          </section>
        ))}
        {!branches.length && <p className="prod-empty">Satış şubəsi tapılmadı.</p>}
      </div>

      <Modal
        open={!!transfer}
        title={transfer ? `${transfer.branch.name} — ${transfer.product.name}` : "Göndər"}
        onClose={() => setTransfer(null)}
      >
        {transfer ? (
          <form className="erp-form" onSubmit={submitTransfer}>
            <p className="hint-text">
              Şubədə indi: {branchStocks?.[transfer.branch.id]?.[transfer.product.id]?.stockGrams || 0} qram.
              İstehsalatda hazır: {transfer.product.readyStock} qram.
            </p>
            <label className="erp-field">
              <span>Əlavə ediləcək qram *</span>
              <input type="number" min="1" step="1" value={grams} onChange={(e) => setGrams(e.target.value)} required />
            </label>
            <div className="form-actions">
              <button type="button" className="btn btn-default" onClick={() => setTransfer(null)}>
                Ləğv
              </button>
              <button type="submit" className="prod-btn prod-btn--primary" disabled={saving}>
                Tamam
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
