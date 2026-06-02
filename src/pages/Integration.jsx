import { useState } from "react";
import { useStore } from "../store/StoreContext";
import PageHeader from "../components/ui/PageHeader";
import { runAsync } from "../utils/runAsync";

export default function Integration() {
  const { state, updateIntegration } = useStore();
  const [message, setMessage] = useState("");

  const toggle = async (item) => {
    const next = item.status === "active" ? "inactive" : "active";
    await runAsync(() => updateIntegration(item.id, next), setMessage);
    setMessage(`${item.name} ${next === "active" ? "aktif" : "pasif"} edildi.`);
  };

  return (
    <div>
      <PageHeader title="Entegrasyonlar" />
      {message && <div className="alert alert-info">{message}</div>}
      <div className="integration-grid">
        {state.integrations.map((item) => (
          <div key={item.id} className="card integration-card">
            <h5>{item.name}</h5>
            <p>{item.description}</p>
            <span className={`status-pill ${item.status}`}>{item.status === "active" ? "Aktif" : "Pasif"}</span>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => toggle(item)}>
              {item.status === "active" ? "Pasif Yap" : "Aktif Yap"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
