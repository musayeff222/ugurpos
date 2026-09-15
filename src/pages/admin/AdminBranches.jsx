import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import { formatMoney } from "../../utils/format";
import { getBranchLabel } from "../../utils/branchDisplay";
import { adminCreatePath, adminRecordPath, isProductionKind } from "../../utils/adminPaths";

export default function AdminBranches({ kind = "sales" }) {
  const isProduction = kind === "production";
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const [draft, setDraft] = useState(q);

  useEffect(() => {
    setDraft(q);
  }, [q]);

  useEffect(() => {
    api
      .getAdminBranches()
      .then(setBranches)
      .catch((e) => setError(e.message));
  }, []);

  const scoped = useMemo(
    () => branches.filter((b) => (isProduction ? isProductionKind(b) : !isProductionKind(b))),
    [branches, isProduction]
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return scoped;
    return scoped.filter((b) => {
      const label = getBranchLabel(b).toLowerCase();
      return (
        label.includes(term) ||
        String(b.email || "").toLowerCase().includes(term) ||
        String(b.branchNo || "").includes(term)
      );
    });
  }, [scoped, q]);

  const applySearch = (e) => {
    e.preventDefault();
    const next = draft.trim();
    if (next) setSearchParams({ q: next });
    else setSearchParams({});
  };

  const createTo = adminCreatePath(kind);
  const listLabel = isProduction ? "İstehsalat" : "Şubeler";

  return (
    <div className="admin-page erp-page">
      <div className="crm-listbar">
        <div>
          <h2>{listLabel}</h2>
          <span>
            {rows.length} / {scoped.length} kayıt
          </span>
        </div>
        <div className="crm-listbar__tools">
          <form className="crm-global-search crm-global-search--inline" onSubmit={applySearch}>
            <i className="fa fa-search" aria-hidden />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ada, e-posta, no..."
            />
          </form>
          <Link to={createTo} className="btn btn-primary btn-sm">
            {isProduction ? "Yeni istehsalat" : "Yeni şube"}
          </Link>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}

      <section className="erp-panel erp-panel--flush">
        <div className="admin-table-wrap admin-table-wrap--desktop-only">
          <table className="erp-table">
            <thead>
              <tr>
                <th>{isProduction ? "İstehsalat adı" : "Şube adı"}</th>
                <th>Durum</th>
                {!isProduction && <th>Bugünkü ciro</th>}
                {!isProduction && <th>Ürün</th>}
                {!isProduction && <th>Müşteri</th>}
                {isProduction && <th>Login</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link className="crm-account" to={adminRecordPath(b)}>
                      <span className="crm-avatar">{String(getBranchLabel(b)).slice(0, 2).toUpperCase()}</span>
                      <span>
                        <strong>{getBranchLabel(b)}</strong>
                        <small>{b.email || "E-posta yok"}</small>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <span className={`admin-badge ${b.active ? "ok" : "off"}`}>{b.active ? "Aktif" : "Pasif"}</span>
                  </td>
                  {!isProduction && <td>{formatMoney(b.stats?.todayTotal || 0)}</td>}
                  {!isProduction && <td>{b.stats?.productCount || 0}</td>}
                  {!isProduction && <td>{b.stats?.customerCount || 0}</td>}
                  {isProduction && <td>{b.email || "—"}</td>}
                  <td>
                    <Link to={adminRecordPath(b)}>Aç</Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={isProduction ? 4 : 6} className="erp-table__empty">
                    {scoped.length === 0 ? (
                      <>
                        Kayıt yok. <Link to={createTo}>{isProduction ? "İlk istehsalatı oluştur" : "İlk şubeyi oluştur"}</Link>
                      </>
                    ) : (
                      "Bu aramada sonuç yok."
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-branch-grid admin-mobile-list">
          {rows.map((b) => (
            <Link
              key={b.id}
              to={adminRecordPath(b)}
              className={`admin-branch-card admin-branch-card--link ${b.active ? "" : "inactive"}`}
            >
              <div className="admin-branch-card__head">
                <div>
                  <h3>{getBranchLabel(b)}</h3>
                  <span className="admin-branch-email">{b.email}</span>
                </div>
                <span className={`admin-badge ${b.active ? "ok" : "off"}`}>{b.active ? "Aktif" : "Pasif"}</span>
              </div>
              {!isProduction && (
                <div className="admin-branch-card__stats admin-branch-card__stats--2">
                  <div>
                    <span>Bugün</span>
                    <strong>{formatMoney(b.stats?.todayTotal || 0)}</strong>
                  </div>
                  <div>
                    <span>Ürün</span>
                    <strong>{b.stats?.productCount || 0}</strong>
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
