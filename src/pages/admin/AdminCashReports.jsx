import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import PageHeader from "../../components/ui/PageHeader";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";
import { formatDateTime, formatMoney, todayISO } from "../../utils/format";
import { getBranchLabel } from "../../utils/branchDisplay";

export default function AdminCashReports() {
  const [branches, setBranches] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [dayReports, setDayReports] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("withdrawals");
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({ amount: "", reason: "", note: "" });
  const [filters, setFilters] = useState({
    branchId: "",
    from: todayISO().slice(0, 8) + "01",
    to: todayISO(),
    staffId: "",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const branchList = await api.getAdminBranches();
      setBranches(branchList);
      const params = {};
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.staffId) params.staffId = filters.staffId;
      const [w, d] = await Promise.all([
        api.getAdminCashWithdrawals(params),
        api.getAdminBusinessDayReports(params),
      ]);
      setWithdrawals(w);
      setDayReports(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const branchMap = useMemo(() => {
    const map = {};
    branches.forEach((b) => {
      map[b.id] = getBranchLabel(b);
    });
    return map;
  }, [branches]);

  const withdrawalTotal = withdrawals.reduce((sum, row) => sum + Number(row.amount || 0), 0);

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
    try {
      await api.updateAdminCashWithdrawal(editRow.id, {
        amount,
        reason: editForm.reason.trim(),
        note: editForm.note.trim(),
      });
      setEditRow(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page">
      <PageHeader
        title="Kasa & İş Günü"
        subtitle="Kassadan çıxarılan pullar və gün sonu hesabatları"
        actions={
          <button type="button" className="btn btn-default btn-sm" onClick={load}>
            Yenile
          </button>
        }
      />

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card form-inline-bar">
        <select
          value={filters.branchId}
          onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}
        >
          <option value="">Tüm şubeler</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{getBranchLabel(b)}</option>
          ))}
        </select>
        <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        <button type="button" className="btn btn-primary btn-sm" onClick={load}>
          Filtrele
        </button>
      </div>

      <div className="admin-stats admin-stats--compact">
        <div className="admin-stat-card">
          <span>Kassadan xərc (filtre)</span>
          <strong>{formatMoney(withdrawalTotal)}</strong>
          <small>{withdrawals.length} əməliyyat</small>
        </div>
        <div className="admin-stat-card">
          <span>Arxiv iş günü</span>
          <strong>{dayReports.length}</strong>
          <small>gün sonu hesabat</small>
        </div>
      </div>

      <ul className="admin-tabs">
        <li>
          <button type="button" className={tab === "withdrawals" ? "active" : ""} onClick={() => setTab("withdrawals")}>
            Kassadan çıxarılanlar
          </button>
        </li>
        <li>
          <button type="button" className={tab === "days" ? "active" : ""} onClick={() => setTab("days")}>
            Gün sonu hesabatları
          </button>
        </li>
      </ul>

      {loading && <p className="admin-empty-inline">Yükleniyor…</p>}

      {tab === "withdrawals" && !loading && (
        <div className="card">
          <div className="card-body">
            <DataTable
              columns={[
                { key: "createdAt", label: "Tarix", render: (r) => formatDateTime(r.createdAt) },
                {
                  key: "branchId",
                  label: "Filial",
                  render: (r) => branchMap[r.branchId] || r.branchId,
                },
                { key: "staffName", label: "Personal" },
                { key: "reason", label: "Səbəb" },
                { key: "note", label: "Qeyd" },
                { key: "amount", label: "Məbləğ", render: (r) => formatMoney(r.amount) },
                {
                  key: "actions",
                  label: "",
                  render: (r) => (
                    <button type="button" className="btn btn-default btn-sm" onClick={() => openEdit(r)}>
                      Düzəlt
                    </button>
                  ),
                },
              ]}
              rows={withdrawals}
            />
          </div>
        </div>
      )}

      {tab === "days" && !loading && (
        <div className="card">
          <div className="card-body">
            <DataTable
              columns={[
                { key: "businessDate", label: "İş günü" },
                {
                  key: "branchId",
                  label: "Filial",
                  render: (r) => branchMap[r.branchId] || r.branchId,
                },
                {
                  key: "hours",
                  label: "Saat",
                  render: (r) => `${r.openTime} – ${r.closeTime}`,
                },
                {
                  key: "openingCash",
                  label: "Açılış",
                  render: (r) => formatMoney(r.openingCash),
                },
                {
                  key: "closingCash",
                  label: "Bağlanış",
                  render: (r) => formatMoney(r.closingCash),
                },
                {
                  key: "totalSales",
                  label: "Satış",
                  render: (r) => formatMoney(r.stats?.totalSales || 0),
                },
                {
                  key: "closedAt",
                  label: "Bağlandı",
                  render: (r) => formatDateTime(r.closedAt),
                },
              ]}
              rows={dayReports}
            />
          </div>
        </div>
      )}
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
          <label>Səbəb *</label>
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
