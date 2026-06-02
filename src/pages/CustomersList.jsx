import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store/StoreContext";
import DataTable from "../components/ui/DataTable";
import Modal from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import { formatMoney } from "../utils/format";
import { runAsync } from "../utils/runAsync";

export default function CustomersList() {
  const { state, addCustomer } = useStore();
  const [onlyDebt, setOnlyDebt] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    note: "",
    creditLimit: 0,
    debt: 0,
  });

  const rows = useMemo(() => {
    let list = state.customers.map((c) => ({
      ...c,
      openAccount: formatMoney(c.debt),
      remainingDebt: formatMoney(c.debt),
    }));
    if (onlyDebt) list = list.filter((c) => (c.debt || 0) > 0);
    return list;
  }, [state.customers, onlyDebt]);

  const totalDebt = state.customers.reduce((s, c) => s + (c.debt || 0), 0);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const ok = await runAsync(() => addCustomer(form), setMessage);
    if (ok) {
      setForm({ name: "", phone: "", address: "", note: "", creditLimit: 0, debt: 0 });
      setModalOpen(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={`Müşteriler (${state.customers.length} kişi)`}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <i className="fa fa-plus-circle" /> Yeni Müşteri Oluştur
          </button>
        }
      />
      {message && <div className="alert alert-info">{message}</div>}

      <div className="card summary-inline">
        <span>
          Müşterilerinizin toplam borcu: <strong style={{ color: "red" }}>{formatMoney(totalDebt)}</strong>
        </span>
        <label>
          Sadece borcu olanları göster{" "}
          <input type="checkbox" checked={onlyDebt} onChange={(e) => setOnlyDebt(e.target.checked)} />
        </label>
      </div>

      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: "name", label: "Müşteri" },
              { key: "purchaseCount", label: "Alışveriş sayısı" },
              { key: "openAccount", label: "Açık hesap" },
              { key: "remainingDebt", label: "Kalan borcu" },
              { key: "lastPaymentDate", label: "Son ödeme tarihi", render: (r) => r.lastPaymentDate || "—" },
              {
                key: "detail",
                label: "Detay",
                render: (r) => (
                  <Link to={`/customers?id=${r.id}`} className="btn btn-info btn-sm">
                    Detay
                  </Link>
                ),
              },
            ]}
            rows={rows}
          />
        </div>
      </div>

      <Modal
        open={modalOpen}
        title="Yeni Müşteri Oluştur"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="submit" form="customer-form" className="btn btn-success">
              Oluştur
            </button>
            <button type="button" className="btn btn-default" onClick={() => setModalOpen(false)}>
              Kapat
            </button>
          </>
        }
      >
        <form id="customer-form" className="form-stack" onSubmit={handleCreate}>
          <label>Müşteri Tanımı *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <label>Telefon</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <label>Adres</label>
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <label>Müşteri notu</label>
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <label>Veresiye limiti</label>
          <input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
        </form>
      </Modal>
    </div>
  );
}
