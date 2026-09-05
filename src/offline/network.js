const HEALTH_PATH = "/api/health";
const LISTENERS = new Set();

let online = typeof navigator === "undefined" ? true : navigator.onLine;
let pinging = false;

export function isAppOnline() {
  return online;
}

export function isNetworkError(err) {
  if (!err) return false;
  if (err.offline) return true;
  const status = Number(err.status);
  if (status === 0 || status === 502 || status === 503 || status === 504) return true;
  const message = String(err.message || "");
  return /failed to fetch|networkerror|network request failed|load failed|offline|internet/i.test(message);
}

function emit() {
  LISTENERS.forEach((fn) => {
    try {
      fn(online);
    } catch {
      /* ignore */
    }
  });
}

export function subscribeOnline(fn) {
  LISTENERS.add(fn);
  fn(online);
  return () => LISTENERS.delete(fn);
}

export async function pingHost() {
  if (pinging) return online;
  pinging = true;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(HEALTH_PATH, { method: "GET", cache: "no-store", signal: ctrl.signal });
    clearTimeout(timer);
    setOnline(res.ok);
  } catch {
    setOnline(false);
  } finally {
    pinging = false;
  }
  return online;
}

export function setOnline(next) {
  const value = Boolean(next);
  if (value === online) return;
  online = value;
  emit();
}

export function startNetworkMonitor() {
  if (typeof window === "undefined") return () => {};

  const onOnline = () => {
    setOnline(true);
    pingHost();
  };
  const onOffline = () => setOnline(false);

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  pingHost();
  const timer = setInterval(pingHost, 20000);

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    clearInterval(timer);
  };
}
