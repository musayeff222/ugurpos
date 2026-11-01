export function isElectronRuntime() {
  if (typeof window === "undefined") return false;
  if (window.ugurpos?.isDesktop === true) return true;
  return /Electron/i.test(window.navigator?.userAgent || "");
}

export function quitDesktopApp() {
  if (typeof window === "undefined") return;
  if (typeof window.ugurpos?.quitApp === "function") {
    window.ugurpos.quitApp();
    return;
  }
  window.close();
}
