import { useStore } from "../store/StoreContext";
import PageHeader from "../components/ui/PageHeader";

export default function Integration() {
  const { state } = useStore();

  return (
    <div>
      <PageHeader title="Entegrasyonlar" />
      <div className="integration-grid">
        {state.integrations.map((item) => (
          <div key={item.id} className="card integration-card">
            <h5>{item.name}</h5>
            <p>{item.description}</p>
            <span className={`status-pill ${item.status}`}>{item.status === "active" ? "Aktif" : "Pasif"}</span>
            <button type="button" className="btn btn-primary btn-sm">
              Yapılandır
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
