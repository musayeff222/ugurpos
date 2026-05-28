import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useStore } from "../store/StoreContext";
import DataTable from "../components/ui/DataTable";
import PageHeader from "../components/ui/PageHeader";
import { formatDateTime, formatMoney } from "../utils/format";

export default function CustomerDetail() {
  const { state, addCustomerPayment } = useStore();
  const [params] = useSearchParams();
  const customerId = params.get("id") || state.customers[0]?.id;
  const customer = state.customers.find((c) => c.id === customerId);
  const [paymentAmount, setPaymentAmount] = useState("");

  const sales = useMemo(
    () => state.sales.filter((s) => s.customerId === customerId),
    [state.sales, customerId]
  );

  if (!customer) {
    return (
      <div className="card empty-state">
        <p>Müşteri bulunamadı.</p>
        <Link to="/customersList">Müşteri listesine dön</Link>
      </div>
    );
  }

  const handlePayment = (e) => {
    e.preventDefault();
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) return;
    addCustomerPayment(customer.id, amount);
    setPaymentAmount("");
  };

  return (
    <div>
      <PageHeader
        title={`Hesap Özeti — ${customer.name}`}
        actions={
          <Link to="/customersList" className="btn btn-default">
            Geri
          </Link>
        }
      />

      <div className="row">
        <div className="col half-col">
          <div className="card">
            <div className="card-header">
              <h5>Müşteri Bilgileri</h5>
            </div>
            <div className="card-body detail-grid">
              <p>
                <span>Telefon</span> {customer.phone || "—"}
              </p>
              <p>
                <span>Adres</span> {customer.address || "—"}
              </p>
              <p>
                <span>Not</span> {customer.note || "—"}
              </p>
              <p>
                <span>Veresiye limiti</span> {formatMoney(customer.creditLimit)}
              </p>
              <p>
                <span>Kalan borç</span> <strong>{formatMoney(customer.debt)}</strong>
              </p>
              <p>
                <span>Alışveriş sayısı</span> {customer.purchaseCount || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="col half-col">
          <div className="card">
            <div className="card-header">
              <h5>Ödeme Al</h5>
            </div>
            <form className="card-body form-stack" onSubmit={handlePayment}>
              <label>Tutar</label>
              <input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
              <button type="submit" className="btn btn-success">
                Ödeme Kaydet
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5>Satış Geçmişi</h5>
        </div>
        <div className="card-body">
          <DataTable
            columns={[
              { key: "code", label: "Satış kodu" },
              { key: "total", label: "Tutar", render: (r) => formatMoney(r.total) },
              { key: "paymentType", label: "Ödeme" },
              { key: "createdAt", label: "Tarih", render: (r) => formatDateTime(r.createdAt) },
            ]}
            rows={sales}
            emptyText="Bu müşteriye ait satış yok."
          />
        </div>
      </div>
    </div>
  );
}
