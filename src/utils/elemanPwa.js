let deferredPrompt = null;
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn(Boolean(deferredPrompt)));
}

function takePrompt(event) {
  if (event?.preventDefault) event.preventDefault();
  deferredPrompt = event || window.__ugurposInstall || null;
  if (typeof window !== "undefined") window.__ugurposInstall = deferredPrompt;
  notify();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", takePrompt);
  window.addEventListener("ugurpos-can-install", () => takePrompt(window.__ugurposInstall));
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    window.__ugurposInstall = null;
    notify();
  });
  if (window.__ugurposInstall) takePrompt(window.__ugurposInstall);
}

function ua() {
  return typeof navigator === "undefined" ? "" : navigator.userAgent || "";
}

export function isIosDevice() {
  return /iphone|ipad|ipod/i.test(ua()) || (typeof navigator !== "undefined" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isAndroidDevice() {
  return /android/i.test(ua());
}

export function isInAppBrowser() {
  const text = ua();
  return /FBAN|FBAV|Instagram|Line\/|WhatsApp|Twitter|Snapchat|TikTok|Bytedance|WebView/i.test(text) || (isAndroidDevice() && /; wv\)/.test(text));
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

  const appleTags = [
    ["apple-mobile-web-app-capable", "yes"],
    ["mobile-web-app-capable", "yes"],
    ["apple-mobile-web-app-status-bar-style", "black-translucent"],
    ["apple-mobile-web-app-title", "Çiğköfte"],
  ];
  appleTags.forEach(([name, content]) => {
    let tag = document.querySelector(`meta[name="${name}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      tag.name = name;
      document.head.appendChild(tag);
    }
    tag.content = content;
  });

  let apple = document.querySelector('link[rel="apple-touch-icon"]');
  if (!apple) {
    apple = document.createElement("link");
    apple.rel = "apple-touch-icon";
    document.head.appendChild(apple);
  }
  apple.href = "/icons/cigkofte-192.png";

  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }

  if (window.__ugurposInstall) takePrompt(window.__ugurposInstall);
}

export function isElemanStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || Boolean(window.navigator.standalone);
}

export function canInstallEleman() {
  return Boolean(deferredPrompt || (typeof window !== "undefined" && window.__ugurposInstall));
}

export function subscribeElemanInstall(fn) {
  listeners.add(fn);
  fn(canInstallEleman());
  return () => listeners.delete(fn);
}

export function openElemanInChrome() {
  if (typeof window === "undefined") return;
  const path = `${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`;
  const fallback = encodeURIComponent(window.location.href);
  window.location.href = `intent://${path}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
}

export async function installElemanApp() {
  const promptEvent = deferredPrompt || (typeof window !== "undefined" ? window.__ugurposInstall : null);
  if (!promptEvent?.prompt) return { ok: false, reason: "missing" };
  promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  deferredPrompt = null;
  if (typeof window !== "undefined") window.__ugurposInstall = null;
  notify();
  return { ok: choice.outcome === "accepted", reason: choice.outcome };
}
