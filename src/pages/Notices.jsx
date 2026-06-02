import { useState } from "react";
import { useStore } from "../store/StoreContext";
import PageHeader from "../components/ui/PageHeader";
import { runAsync } from "../utils/runAsync";

export default function Notices() {
  const { state, markNoticeRead } = useStore();
  const [message, setMessage] = useState("");

  return (
    <div>
      <PageHeader title="Duyurular" />
      {message && <div className="alert alert-info">{message}</div>}
      <div className="notice-list">
        {state.notices.map((n) => (
          <div key={n.id} className={`card notice-item ${n.read ? "read" : ""}`}>
            <div>
              <h5>{n.title}</h5>
              <small>{n.date}</small>
            </div>
            {!n.read && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => runAsync(() => markNoticeRead(n.id), setMessage)}>
                Okundu
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
