import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { startNetworkMonitor, subscribeOnline } from "./network";
import { getQueueCount, subscribeQueue } from "./queue";
import { startSyncLoop } from "./sync";

const OfflineContext = createContext(null);

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [pendingCount, setPendingCount] = useState(() => (typeof localStorage === "undefined" ? 0 : getQueueCount()));
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);

  useEffect(() => {
    const stopNet = startNetworkMonitor();
    const unsubOnline = subscribeOnline(setIsOnline);
    const unsubQueue = subscribeQueue((list) => setPendingCount(list.length));
    const stopSync = startSyncLoop((result) => {
      setSyncing(false);
      if (result?.flushed > 0) setLastSyncAt(new Date().toISOString());
    });

    return () => {
      stopNet();
      unsubOnline();
      unsubQueue();
      stopSync();
    };
  }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0) setSyncing(true);
    if (pendingCount === 0) setSyncing(false);
  }, [isOnline, pendingCount]);

  const value = useMemo(
    () => ({
      isOnline,
      pendingCount,
      syncing: syncing && pendingCount > 0,
      lastSyncAt,
    }),
    [isOnline, pendingCount, syncing, lastSyncAt]
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline must be used within OfflineProvider");
  return ctx;
}
