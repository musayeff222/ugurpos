import { useEffect, useState } from "react";
import { api } from "../../api/client";
import Modal from "../../components/ui/Modal";

const emptyCreate = { name: "", stock: "", unit: "Adet" };

export default function ProductionWarehouse() {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [stockRow, setStockRow] = useState(null);
  const [stockQty, setStockQty] = useState("");
  const [transfer, setTransfer] = useState(null);
  const [transferQty, setTransferQty] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [list, send] = await Promise.all([
      api.getProductionWarehouse(),
      api.getProductionWarehouseBranches(),
    ]);
    setRows(list);
    setBranches(send.branches || []);
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.createProductionWarehouseItem({
        name: createForm.name,
        unit: createForm.unit || "Adet",
        stock: Number(createForm.stock) || 0,
      });
      setCreateForm(emptyCreate);
      setCreateOpen(false);
      setMessage("Anbar məhsulu əlavə olundu.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addStock = async (e) => {
    e.preventDefault();
    if (!stockRow) return;
    setSaving(true);
    setError("");
    try {
      await api.addProductionWarehouseStock(stockRow.id, { qty: Number(stockQty) });
      setStockRow(null);
      setStockQty("");
      setMessage("Stok əlavə olundu.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`"${row.name}" anbardan silinsin?`)) return;
    setError("");
    try {
      await api.deleteProductionWarehouseItem(row.id);
      setMessage("Anbar məhsulu silindi.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const openTransfer = (row) => {
    setTransfer(row);
    setTransferQty("");
    setError("");
  };

  const submitTransfer = async (e) => {
    e.preventDefault();
    if (!transfer) return;
    setSaving(true);
    setError("");
    try {
      const targetBranchId = e.target.branchId.value;
      const result = await api.transferProductionWarehouseItem({
        itemId: transfer.id,
        targetBranchId,
        qty: Number(transferQty),
      });
      setMessage(
        `${result.qty} ${result.unit} ${result.itemName} → ${result.targetBranchName}. Şubə stoku: ${result.targetStockAfter}.`
      );
      setTransfer(null);
      setTransferQty("");
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
          <p className="prod-kicker">Anbar</p>
          <h1>Anbar</h1>
          <span>Məhsul adı və stok yazın, istədiyiniz şubəyə göndərin</span>
        </div>
        <button type="button" className="prod-btn prod-btn--primary" onClick={() => setCreateOpen(true)}>
          + Yeni məhsul
        </button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}

      <section className="prod-panel">
        <div className="admin-table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Məhsul</th>
                <th>Stok</th>
                <th>Vahid</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                  </td>
                  <td>{row.stock}</td>
                  <td>{row.unit}</td>
                  <td className="prod-actions">
                    <button
                      type="button"
                      className="prod-icon prod-icon--add"
                      title="Stok əlavə et"
                      onClick={() => {
                        setStockRow(row);
                        setStockQty("");
                      }}
                    >
                      <i className="fa fa-plus" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="prod-btn prod-btn--primary prod-btn--sm"
                      disabled={!(row.stock > 0) || !branches.length}
                      onClick={() => openTransfer(row)}
                    >
                      Göndər
                    </button>
                    <button type="button" className="prod-icon prod-icon--danger" title="Sil" onClick={() => remove(row)}>
                      <i className="fa fa-trash" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={4} className="erp-table__empty">
                    Anbarda məhsul yoxdur. Məsələn: Ayran, 100 ədəd.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={createOpen} title="Yeni anbar məhsulu" onClose={() => setCreateOpen(false)}>
        <form className="erp-form" onSubmit={create}>
          <label className="erp-field">
            <span>Məhsul adı *</span>
            <input
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="Məsələn: Ayran"
              required
            />
          </label>
          <label className="erp-field">
            <span>Stok *</span>
            <input
              type="number"
              min="0"
              step="1"
              value={createForm.stock}
              onChange={(e) => setCreateForm({ ...createForm, stock: e.target.value })}
              placeholder="100"
              required
            />
          </label>
          <label className="erp-field">
            <span>Vahid</span>
            <select value={createForm.unit} onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}>
              <option value="Adet">Adet</option>
              <option value="qutu">qutu</option>
              <option value="kq">kq</option>
              <option value="qram">qram</option>
            </select>
          </label>
          <div className="form-actions">
            <button type="submit" className="prod-btn prod-btn--primary" disabled={saving}>
              {saving ? "Yadda saxlanır..." : "Yarat"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!stockRow} title={stockRow ? `${stockRow.name} — stok əlavə et` : "Stok"} onClose={() => setStockRow(null)}>
        {stockRow ? (
          <form className="erp-form" onSubmit={addStock}>
            <p className="hint-text">
              İndi: {stockRow.stock} {stockRow.unit}
            </p>
            <label className="erp-field">
              <span>Əlavə ediləcək miqdar *</span>
              <input type="number" min="1" step="1" value={stockQty} onChange={(e) => setStockQty(e.target.value)} required />
            </label>
            <div className="form-actions">
              <button type="button" className="btn btn-default" onClick={() => setStockRow(null)}>
                Ləğv
              </button>
              <button type="submit" className="prod-btn prod-btn--primary" disabled={saving}>
                Əlavə et
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal open={!!transfer} title={transfer ? `${transfer.name} — şubəyə göndər` : "Göndər"} onClose={() => setTransfer(null)}>
        {transfer ? (
          <form className="erp-form" onSubmit={submitTransfer}>
            <p className="hint-text">
              Anbarda: {transfer.stock} {transfer.unit}
            </p>
            <label className="erp-field">
              <span>Şube *</span>
              <select name="branchId" required defaultValue="">
                <option value="" disabled>
                  Şube seçin
                </option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                    {branch.branchNo ? ` (#${branch.branchNo})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="erp-field">
              <span>Göndəriləcək miqdar *</span>
              <input
                type="number"
                min="1"
                step="1"
                max={transfer.stock}
                value={transferQty}
                onChange={(e) => setTransferQty(e.target.value)}
                required
              />
            </label>
            <div className="form-actions">
              <button type="button" className="btn btn-default" onClick={() => setTransfer(null)}>
                Ləğv
              </button>
              <button type="submit" className="prod-btn prod-btn--primary" disabled={saving}>
                Göndər
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
