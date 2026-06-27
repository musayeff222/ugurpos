import { useEffect, useState } from "react";
import { useStore } from "../store/StoreContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { formatDateTime, formatMoney } from "../utils/format";
import { runAsync } from "../utils/runAsync";
import "../styles/report-mobile.css";

export default function CashExpense() {
  const { state, addCashWithdrawal } = useStore();
  const { activeStaffName, isStaffUser } = useAuth();
  const [balance, setBalance] = useState(null);
  const [form, setForm] = useState({ amount: "", reason: "", note: "" });
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
        </div>
        <div className="card-body">
          {withdrawals.length === 0 ? (
            <p className="hint-text">Hələ kassadan xərc qeydi yoxdur.</p>
          ) : (
            <div className="report-sale-list">
              {withdrawals.slice(0, 30).map((row) => (
                <article key={row.id} className="report-sale-row">
                  <div className="report-sale-row__main">
                    <strong>{formatMoney(row.amount)}</strong>
                    <span>{row.reason}</span>
                    {row.note && <small>{row.note}</small>}
                  </div>
                  <div className="report-sale-row__meta">
                    <span>{row.staffName}</span>
                    <time>{formatDateTime(row.createdAt)}</time>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
