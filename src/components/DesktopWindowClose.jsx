import { useEffect } from "react";
import { useLocale } from "../context/LocaleContext";
import { isElectronRuntime, quitDesktopApp } from "../utils/desktopApp";
import "../styles/login.css";

export default function DesktopWindowClose() {
  const { t } = useLocale();
  const desktop = isElectronRuntime();

  useEffect(() => {
    if (!desktop) return undefined;
    document.documentElement.classList.add("ugurpos-desktop-shell");
    return () => document.documentElement.classList.remove("ugurpos-desktop-shell");
  }, [desktop]);

  if (!desktop) return null;

  return (
    <button type="button" className="desktop-window-close" onClick={quitDesktopApp}>
      <span aria-hidden="true">×</span>
      {t("login.quitApp")}
    </button>
  );
}
