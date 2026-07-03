import { useEffect, useState } from "react";
import TouchNumpad from "./touch/TouchNumpad";
import TouchTextKeyboard from "./touch/TouchTextKeyboard";
import { formatMoney } from "../utils/format";
import "../styles/touch-keyboard.css";

export default function CashExpenseModal({
  open,
  onClose,
  onSubmit,
  balance = null,
  loading = false,
  externalFeedback = "",
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [activeField, setActiveField] = useState("amount");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setReason("");
    setNote("");
    setActiveField("amount");
    setFeedback("");
  }, [open]);

  useEffect(() => {
    if (externalFeedback) setFeedback(externalFeedback);
  }, [externalFeedback]);

  if (!open) return null;

  const activeValue = activeField === "amount" ? amount : activeField === "reason" ? reason : note;
  const setActiveValue = activeField === "amount" ? setAmount : activeField === "reason" ? setReason : setNote;

  const handleSubmit = async () => {
    const num = Number(amount);
    if (!num || num <= 0) {
      setFeedback("Geçerli məbləğ girin.");
      setActiveField("amount");
      return;
    }
    if (!reason.trim()) {
      setFeedback("Xərc səbəbi zəruridir.");
      setActiveField("reason");
      return;
    }
    setFeedback("");
    try {
      await onSubmit({
        amount: num,
        reason: reason.trim(),
        note: note.trim(),
      });
    } catch (err) {
      setFeedback(err.message || "Xərc qeyd edilə bilmədi.");
    }
  };

  return (
    <div className="cash-expense-overlay" onClick={onClose}>
      <div className="cash-expense-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Kassadan xərc">
        <header className="cash-expense-modal__head">
          <div className="cash-expense-modal__title">
            <strong>Kassadan xərc</strong>
            {balance != null && (
              <span className={`cash-expense-modal__balance${Number(balance.balance || 0) < 0 ? " negative" : ""}`}>
                Kasa: {formatMoney(balance.balance || 0, "az")}
              </span>
            )}
          </div>
          <button type="button" className="cash-expense-modal__close" onClick={onClose} aria-label="Bağla">
            ×
          </button>
        </header>

        <div className="cash-expense-modal__body">
          <div className="cash-expense-modal__side">
            <div className="cash-expense-modal__fields">
              <button
                type="button"
                className={`cash-expense-field${activeField === "amount" ? " active" : ""}`}
                onClick={() => setActiveField("amount")}
              >
                <span>Məbləğ</span>
                <strong>{amount || "0.00"}</strong>
              </button>
              <button
                type="button"
                className={`cash-expense-field${activeField === "reason" ? " active" : ""}`}
                onClick={() => setActiveField("reason")}
              >
                <span>Səbəb *</span>
                <strong>{reason || "—"}</strong>
              </button>
              <button
                type="button"
                className={`cash-expense-field${activeField === "note" ? " active" : ""}`}
                onClick={() => setActiveField("note")}
              >
                <span>Qeyd</span>
                <strong>{note || "—"}</strong>
              </button>
            </div>

            {feedback && (
              <p className={`cash-expense-modal__feedback${feedback.includes("qeyd") ? " ok" : ""}`}>{feedback}</p>
            )}

            <footer className="cash-expense-modal__actions">
              <button type="button" className="btn btn-default" onClick={onClose} disabled={loading}>
                Ləğv
              </button>
              <button type="button" className="btn btn-success" onClick={handleSubmit} disabled={loading}>
                {loading ? "…" : "Qeyd et"}
              </button>
            </footer>
          </div>

          <div className="cash-expense-modal__keyboard">
            {activeField === "amount" ? (
              <TouchNumpad value={amount} onChange={setAmount} />
            ) : (
              <TouchTextKeyboard value={activeValue} onChange={setActiveValue} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
