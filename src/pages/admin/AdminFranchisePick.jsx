import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { getBranchLabel } from "../../utils/branchDisplay";
import { isFranchiseKind, isProductionKind } from "../../utils/adminPaths";

export default function AdminFranchisePick() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    api
      .getAdminBranches()
      .then(setBranches)
      .catch((e) => setError(e.message));
  }, []);

  const rows = useMemo(
    () => branches.filter((b) => !isProductionKind(b) && !isFranchiseKind(b)),
    [branches]
  );

  const pick = async (branch) => {
    const name = getBranchLabel(branch);
    if (
      !window.confirm(
        `"${name}" şubesi Franchise'a taşınacak. Şubeler ve gün kapat listesinden çıkarılacak. Devam?`
      )
    ) {
      return;
    }
    setError("");
    setBusyId(branch.id);
    try {
      await api.updateBranch(branch.id, { kind: "franchise" });
      navigate("/admin/franchise");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="admin-page erp-page">
      <div className="crm-listbar">
        <div>
          <h2>Şube ekle</h2>
          <span>Şubelerden birini Franchise'a taşıyın</span>
        </div>
        <div className="crm-listbar__tools">
          <Link to="/admin/franchise" className="btn btn-default btn-sm">
            Geri
          </Link>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}

      <section className="erp-panel erp-panel--flush">
        <div className="admin-table-wrap admin-table-wrap--desktop-only">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Şube adı</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td>
                    <span className="crm-account">
                      <span className="crm-avatar">{String(getBranchLabel(b)).slice(0, 2).toUpperCase()}</span>
                      <span>
                        <strong>{getBranchLabel(b)}</strong>
                        <small>{b.email || "E-posta yok"}</small>
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge ${b.active ? "ok" : "off"}`}>{b.active ? "Aktif" : "Pasif"}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busyId === b.id}
                      onClick={() => pick(b)}
                    >
                      {busyId === b.id ? "Taşınıyor..." : "Seç"}
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="erp-table__empty">
                    Taşınacak şube yok. <Link to="/admin/branches">Şubeler</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-branch-grid admin-mobile-list">
          {rows.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`admin-branch-card ${b.active ? "" : "inactive"}`}
              disabled={busyId === b.id}
              onClick={() => pick(b)}
              style={{ textAlign: "left", width: "100%" }}
            >
              <div className="admin-branch-card__head">
                <div>
                  <h3>{getBranchLabel(b)}</h3>
                  <span className="admin-branch-email">{b.email}</span>
                </div>
                <span className={`admin-badge ${b.active ? "ok" : "off"}`}>{b.active ? "Aktif" : "Pasif"}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
