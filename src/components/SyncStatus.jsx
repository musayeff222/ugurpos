import { useOffline } from "../offline/OfflineContext";

export default function SyncStatus() {
  const { isOnline, pendingCount, syncing } = useOffline();

  let label = "Onlayn";
  let className = "sync-status sync-status--online";
  if (!isOnline) {
    label = pendingCount > 0 ? `Oflayn · ${pendingCount} qeyd gözləyir` : "Oflayn";
    className = "sync-status sync-status--offline";
  } else if (syncing || pendingCount > 0) {
    label = pendingCount > 0 ? `Yüklənir... ${pendingCount}` : "Yüklənir...";
    className = "sync-status sync-status--syncing";
  }

  return (
    <span className={className} title={label}>
      <i className={`fa ${isOnline ? "fa-wifi" : "fa-exclamation-circle"}`} aria-hidden />
      <span>{label}</span>
    </span>
  );
}
