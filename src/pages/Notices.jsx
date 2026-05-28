import { useStore } from "../store/StoreContext";
import PageHeader from "../components/ui/PageHeader";

export default function Notices() {
  const { state, markNoticeRead } = useStore();

  return (
    <div>
      <PageHeader title="Duyurular" />
      <div className="notice-list">
        {state.notices.map((n) => (
          <div key={n.id} className={`card notice-item ${n.read ? "read" : ""}`}>
            <div>
              <h5>{n.title}</h5>
              <small>{n.date}</small>
            </div>
            {!n.read && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => markNoticeRead(n.id)}>
                Okundu
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
