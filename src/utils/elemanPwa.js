let deferredPrompt = null;
const listeners = new Set();

function notify() {
  const ready = Boolean(deferredPrompt);
  listeners.forEach((fn) => fn(ready));
}

export function initElemanPwa() {
  if (typeof document === "undefined" || window.__ugurposElemanPwa) return;
  window.__ugurposElemanPwa = true;

  let manifest = document.querySelector('link[rel="manifest"]');
  if (!manifest) {
    manifest = document.createElement("link");
    manifest.rel = "manifest";
    document.head.appendChild(manifest);
  }
  manifest.href = "/eleman-manifest.webmanifest";

  let theme = document.querySelector('meta[name="theme-color"]');
  if (!theme) {
    theme = document.createElement("meta");
    theme.name = "theme-color";
    document.head.appendChild(theme);
  }
  theme.content = "#7a1f12";

  let apple = document.querySelector('link[rel="apple-touch-icon"]');
  if (!apple) {
    apple = document.createElement("link");
    apple.rel = "apple-touch-icon";
    document.head.appendChild(apple);
  }
  apple.href = "/icons/cigkofte-192.png";

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

export function isElemanStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || Boolean(window.navigator.standalone);
}

export function canInstallEleman() {
  return Boolean(deferredPrompt);
}

export function subscribeElemanInstall(fn) {
  listeners.add(fn);
  fn(Boolean(deferredPrompt));
  return () => listeners.delete(fn);
}

export async function installElemanApp() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  notify();
  return choice.outcome === "accepted";
}
