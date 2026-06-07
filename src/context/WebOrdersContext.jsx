import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";

const WebOrdersContext = createContext(null);

const POLL_MS = 5000;

function playNewOrderSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [880, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.12;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime + i * 0.22;
      osc.start(start);
      osc.stop(start + 0.18);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    /* ses desteklenmiyorsa sessiz devam */
  }
}

export function WebOrdersProvider({ children }) {
  const { isBranchUser } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [latestOrder, setLatestOrder] = useState(null);
  const knownIdsRef = useRef(new Set());
  const readyRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!isBranchUser) return [];
    const orders = await api.getQrOrders({ status: "pending" });
    setPendingCount(orders.length);

    if (readyRef.current) {
      const fresh = orders.filter((o) => !knownIdsRef.current.has(o.id));
      if (fresh.length > 0) {
        fresh.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setLatestOrder(fresh[0]);
        playNewOrderSound();
      }
    } else {
      readyRef.current = true;
    }

    knownIdsRef.current = new Set(orders.map((o) => o.id));
    return orders;
  }, [isBranchUser]);

  useEffect(() => {
    if (!isBranchUser) {
      setPendingCount(0);
      setLatestOrder(null);
      knownIdsRef.current = new Set();
      readyRef.current = false;
      return undefined;
    }

    refresh().catch(() => {});
    const timer = setInterval(() => refresh().catch(() => {}), POLL_MS);
    return () => clearInterval(timer);
  }, [isBranchUser, refresh]);

  const clearLatest = useCallback(() => setLatestOrder(null), []);

  return (
    <WebOrdersContext.Provider value={{ pendingCount, latestOrder, refresh, clearLatest }}>
      {children}
    </WebOrdersContext.Provider>
  );
}

export function useWebOrders() {
  const ctx = useContext(WebOrdersContext);
  if (!ctx) throw new Error("useWebOrders must be used within WebOrdersProvider");
  return ctx;
}
