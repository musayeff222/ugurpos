import { useState } from "react";
import { api } from "../../api/client";
import { formatMoney } from "../../utils/format";

export default function AdminDay({ day, onChanged }) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const branches = day?.branches || [];

  const closeDay = async (branch) => {
    const amount = formatMoney(branch.available || 0);
    const text =
      Number(branch.available) > 0
        ? `${branch.name} kasasındaki ${amount} nakit kasaya alınsın ve gün kapansın mı?`
        : `${branch.name} kasası boş. Gün kapansın mı?`;
    if (!window.confirm(text)) return;
    setError("");
    setMessage("");
    setBusyId(branch.id);
    try {
      await api.closeBranchDay(branch.id);
      await onChanged();
      setMessage(`${branch.name} kapatıldı. Satış kayıtları duruyor.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="day-board">
      <div className="crm-listbar">
        <div>
          <h2>{day?.businessDate || "Bugün"}</h2>
          <span>
            {branches.length
              ? `${day.openCount || 0} açık şube · takvim ${day?.today || ""}`
              : "Satış şubesi yok"}
          </span>
        </div>
      </div>

      {day?.blocked && (
        <div className="alert alert-danger">Yeni güne geçilemiyor. Açık şubelerin parasını alıp günü kapatın.</div>
      )}
      {day?.ahead && !day?.blocked && (
        <div className="alert alert-info">Yeni gün açıldı. Şube kasaları sıfırlandı. Satışlar bu günde birikir.</div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}

      <div className="day-branch-grid">
        {branches.map((branch) => (
          <article key={branch.id} className={branch.closed ? "day-card day-card--closed" : "day-card"}>
            <header>
              <h3>{branch.name}</h3>
              <span className={`admin-badge ${branch.closed ? "ok" : "pending"}`}>{branch.closed ? "Kapalı" : "Açık"}</span>
            </header>
            <dl>
              <div>
                <dt>Nakit satış</dt>
                <dd>{formatMoney(branch.cashSales || 0)}</dd>
              </div>
              <div>
                <dt>Gider</dt>
                <dd>{formatMoney(branch.expenses || 0)}</dd>
              </div>
              <div>
                <dt>Kasada</dt>
                <dd>{formatMoney(branch.available || 0)}</dd>
              </div>
            </dl>
            <button
              type="button"
              className="btn btn-primary"
              disabled={branch.closed || busyId === branch.id}
              onClick={() => closeDay(branch)}
            >
              {branch.closed ? "Gün kapandı" : busyId === branch.id ? "Alınıyor..." : "Parayı al ve günü kapat"}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
