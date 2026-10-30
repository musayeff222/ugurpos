import { useLocale } from "../context/LocaleContext";
import { isDesktopApp } from "../offline/staffRoster";

export default function DesktopQuitButton({ className = "btn-login-quit" }) {
  const { t } = useLocale();
  if (!isDesktopApp()) return null;

  const quitApp = () => {
    if (typeof window.ugurpos?.quitApp === "function") {
      window.ugurpos.quitApp();
    }
  };

  return (
    <button type="button" className={className} onClick={quitApp}>
      {t("login.quitApp")}
    </button>
  );
}
