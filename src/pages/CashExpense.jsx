import { useEffect, useState } from "react";
import { useStore } from "../store/StoreContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import Modal from "../components/ui/Modal";
import { formatDateTime, formatMoney } from "../utils/format";
import { runAsync } from "../utils/runAsync";
import "../styles/report-mobile.css";

export default function CashExpense() {
  const { state, addCashWithdrawal, updateCashWithdrawal } = useStore();
  const { activeStaffName, isStaffUser } = useAuth();
  const canEditExpense = !isStaffUser;
  const [balance, setBalance] = useState(null);
  const [form, setForm] = useState({ amount: "", reason: "", note: "" });
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({ amount: "", reason: "", note: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingBalance, setLoadingBalance] = useState(true);

  const loadBalance = async () => {
    setLoadingBalance(true);
    try {
      const data = await api.getCashRegisterBalance();
      setBalance(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    loadBalance();
  }, [state.cashWithdrawals]);

  const withdrawals = state.cashWithdrawals || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setError("Geçerli məbləğ girin");
      return;
    }
    if (!form.reason.trim()) {
      setError("Xərc səbəbi zəruridir");
      return;
    }
    const ok = await runAsync(
      () =>
        addCashWithdrawal({
          amount,
          reason: form.reason.trim(),
          note: form.note.trim(),
        }),
      setMessage
    );
    if (ok) {
      setForm({ amount: "", reason: "", note: "" });
      await loadBalance();
    }
  };

  const openEdit = (row) => {
    setEditRow(row);
    setEditForm({
      amount: String(row.amount ?? ""),
      reason: row.reason || "",
      note: row.note || "",
    });
    setError("");
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editRow) return;
    setMessage("");
    setError("");
    const amount = Number(editForm.amount);
    if (!amount || amount <= 0) {
      setError("Geçerli məbləğ girin");
      return;
    }
    if (!editForm.reason.trim()) {
      setError("Xərc səbəbi zəruridir");
      return;
    }
    const ok = await runAsync(
      () =>
        updateCashWithdrawal(editRow.id, {
          amount,
          reason: editForm.reason.trim(),
          note: editForm.note.trim(),
        }),
      setMessage
    );
    if (ok) {
      setEditRow(null);
      await loadBalance();
    }
  };

  return (
    <div className="report-page">
      <header className="report-hero">
        <div className="report-hero__top">
          <h1>Kassadan Xərc</h1>
          <p className="report-hero__sub">
            {isStaffUser ? activeStaffName : "Şube"} — kassadan çıxarılan məbləğlər
          </p>
        </div>
      </header>

      {message && <div className="alert alert-info">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card report-filter-card">
        <div className="report-summary-card" style={{ margin: 0 }}>
          <span>Nakit Kasa Balansı</span>
          <strong>{loadingBalance ? "…" : formatMoney(balance?.balance || 0)}</strong>
          {balance?.window && (
            <small>
              İş günü: {balance.window.businessDate} ({balance.window.openTime}–{balance.window.closeTime})
            </small>
          )}
        </div>
      </div>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <label>Məbləğ *</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />

        <label>Xərc səbəbi *</label>
        <input
          placeholder="Məs: market, təmizlik..."
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          required
        />

        <label>Qeyd</label>
        <input
          placeholder="İstəyə bağlı"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />

        <div className="form-actions">
          <button type="submit" className="btn btn-success">Kaydet</button>
        </div>
      </form>

      <div className="card">
        <div className="card-header">
          <strong>Son əməliyyatlar</strong>
          {canEditExpense && <small className="hint-text">Yalnız admin düzəldə bilər</small>}
        </div>
        <div className="card-body">
          {withdrawals.length === 0 ? (
            <p className="hint-text">Hələ kassadan xərc qeydi yoxdur.</p>
          ) : (
            <div className="report-sale-list">
              {withdrawals.slice(0, 30).map((row) => (
                <article key={row.id} className="report-sale-row cash-expense-row">
                  <div className="report-sale-row__main">
                    <strong>{formatMoney(row.amount)}</strong>
                    <span>{row.reason}</span>
                    {row.note && <small>{row.note}</small>}
                  </div>
                  <div className="report-sale-row__meta">
                    <span>{row.staffName}</span>
                    <time>{formatDateTime(row.createdAt)}</time>
                    {canEditExpense && (
                      <button type="button" className="btn btn-default btn-sm cash-expense-row__edit" onClick={() => openEdit(row)}>
                        Düzəlt
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={!!editRow} title="Xərci düzəlt" onClose={() => setEditRow(null)}>
        <form className="form-grid" onSubmit={handleEditSubmit}>
          <label>Məbləğ *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={editForm.amount}
            onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
            required
          />

          <label>Xərc səbəbi *</label>
          <input
            value={editForm.reason}
            onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
            required
          />

          <label>Qeyd</label>
          <input value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} />

          <div className="form-actions">
            <button type="button" className="btn btn-default" onClick={() => setEditRow(null)}>
              Ləğv
            </button>
            <button type="submit" className="btn btn-success">
              Yadda saxla
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
