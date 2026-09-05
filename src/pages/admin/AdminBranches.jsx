import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import { formatMoney } from "../../utils/format";
import { getBranchLabel } from "../../utils/branchDisplay";

export default function AdminBranches() {
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

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return branches;
    return branches.filter((b) => {
      const label = getBranchLabel(b).toLowerCase();
      return (
        label.includes(term) ||
        String(b.email || "").toLowerCase().includes(term) ||
        String(b.branchNo || "").includes(term)
      );
    });
  }, [branches, q]);

  const applySearch = (e) => {
    e.preventDefault();
    const next = draft.trim();
    if (next) setSearchParams({ q: next });
    else setSearchParams({});
  };

  return (
    <div className="admin-page erp-page">
      <div className="crm-listbar">
        <div>
          <h2>Hesaplar</h2>
          <span>
            {rows.length} / {branches.length} kayıt
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
          <Link to="/admin/branches/new" className="btn btn-primary btn-sm">
            Yeni
          </Link>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}

      <section className="erp-panel erp-panel--flush">
        <div className="admin-table-wrap admin-table-wrap--desktop-only">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Hesap adı</th>
                <th>Durum</th>
                <th>Bugünkü ciro</th>
                <th>Ürün</th>
                <th>Müşteri</th>
                <th>Sahip</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link className="crm-account" to={`/admin/branches/${b.id}`}>
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
                  <td>{formatMoney(b.stats?.todayTotal || 0)}</td>
                  <td>{b.stats?.productCount || 0}</td>
                  <td>{b.stats?.customerCount || 0}</td>
                  <td>
                    <Link to={`/admin/branches/${b.id}`}>Aç</Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="erp-table__empty">
                    {branches.length === 0 ? (
                      <>
                        Kayıt yok. <Link to="/admin/branches/new">İlk hesabı oluştur</Link>
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
              to={`/admin/branches/${b.id}`}
              className={`admin-branch-card admin-branch-card--link ${b.active ? "" : "inactive"}`}
            >
              <div className="admin-branch-card__head">
                <div>
                  <h3>{getBranchLabel(b)}</h3>
                  <span className="admin-branch-email">{b.email}</span>
                </div>
                <span className={`admin-badge ${b.active ? "ok" : "off"}`}>{b.active ? "Aktif" : "Pasif"}</span>
              </div>
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
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
