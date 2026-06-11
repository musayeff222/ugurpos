import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";

const AdminAlertsContext = createContext(null);

const POLL_MS = 5000;

function playAlertSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [660, 880, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.1;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime + i * 0.15;
      osc.start(start);
      osc.stop(start + 0.12);
    });
    setTimeout(() => ctx.close(), 700);
  } catch {
    /* ignore */
  }
}

function pushDeviceNotification(title, body) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag: "ugurpos-admin-alert" });
  } catch {
    /* ignore */
  }
}

export function AdminAlertsProvider({ children }) {
  const { isAdmin, isAuthenticated } = useAuth();
  const [pendingQrOrders, setPendingQrOrders] = useState(0);
  const [latestAlert, setLatestAlert] = useState(null);
  const afterRef = useRef(new Date().toISOString());
  const knownIdsRef = useRef(new Set());
  const readyRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return undefined;
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    return undefined;
  }, [isAuthenticated, isAdmin]);

  const poll = useCallback(async () => {
    if (!isAuthenticated || !isAdmin) return;
    const data = await api.getAdminActivityPoll(afterRef.current);
    setPendingQrOrders(data.pendingQrOrders || 0);

    const events = data.events || [];
    if (events.length > 0) {
      const newest = events[events.length - 1];
      afterRef.current = newest.createdAt || new Date().toISOString();

      if (readyRef.current) {
        const fresh = events.filter((e) => !knownIdsRef.current.has(e.id));
        if (fresh.length > 0) {
          fresh.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          const item = fresh[fresh.length - 1];
          setLatestAlert(item);
          playAlertSound();
          pushDeviceNotification(item.title, item.detail || item.branchName || "");
        }
      }
      events.forEach((e) => knownIdsRef.current.add(e.id));
    }

    readyRef.current = true;
  }, [isAuthenticated, isAdmin]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      setPendingQrOrders(0);
      setLatestAlert(null);
      knownIdsRef.current = new Set();
      readyRef.current = false;
      afterRef.current = new Date().toISOString();
      return undefined;
    }

    poll().catch(() => {});
    const timer = setInterval(() => poll().catch(() => {}), POLL_MS);
    return () => clearInterval(timer);
  }, [isAuthenticated, isAdmin, poll]);

  const clearLatest = useCallback(() => setLatestAlert(null), []);

  return (
    <AdminAlertsContext.Provider value={{ pendingQrOrders, latestAlert, clearLatest, refresh: poll }}>
      {children}
    </AdminAlertsContext.Provider>
  );
}

export function useAdminAlerts() {
  const ctx = useContext(AdminAlertsContext);
  if (!ctx) throw new Error("useAdminAlerts must be used within AdminAlertsProvider");
  return ctx;
}
