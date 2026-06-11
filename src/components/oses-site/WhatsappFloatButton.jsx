import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "../../context/LocaleContext";
import { getWebConfig } from "../../utils/menuWebConfig";

const INTRO_SESSION_KEY = "ugurpos_wa_float_intro";
const INTRO_DELAY_MS = 5000;
const SCROLL_SHOW_DELAY_MS = 8000;

function buildWhatsappUrl(phone) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

export default function WhatsappFloatButton({ firm }) {
  const { t } = useLocale();
  const web = getWebConfig(firm);
  const [visible, setVisible] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const showTimerRef = useRef(null);

  const whatsappUrl = useMemo(() => {
    if (web.showWhatsappFloat === false) return null;
    const phone =
      web.whatsappFloatPhone?.trim() ||
      firm?.social?.whatsapp?.trim() ||
      "";
    return buildWhatsappUrl(phone);
  }, [firm, web.showWhatsappFloat, web.whatsappFloatPhone, firm?.social?.whatsapp]);

  useEffect(() => {
    if (!whatsappUrl) return undefined;
    if (sessionStorage.getItem(INTRO_SESSION_KEY)) return undefined;

    const introTimer = window.setTimeout(() => {
      setShowIntro(true);
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    }, INTRO_DELAY_MS);

    return () => window.clearTimeout(introTimer);
  }, [whatsappUrl]);

  useEffect(() => {
    if (!whatsappUrl) return undefined;

    const onScroll = () => {
      setVisible(false);
      setShowIntro(false);
      if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
      showTimerRef.current = window.setTimeout(() => {
        setVisible(true);
      }, SCROLL_SHOW_DELAY_MS);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
    };
  }, [whatsappUrl]);

  if (!whatsappUrl) return null;

  const dismissIntro = () => setShowIntro(false);

  return (
    <div
      className={`wa-float${visible ? "" : " wa-float--hidden"}${showIntro ? " wa-float--intro" : ""}`}
      aria-hidden={!visible}
    >
      {showIntro && visible && (
        <div className="wa-float__bubble" role="status">
          {t("qr.whatsappFloatLabel")}
        </div>
      )}
      <a
        href={whatsappUrl}
        className="wa-float__btn"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("qr.whatsappFloatLabel")}
        onClick={dismissIntro}
      >
        <i className="fa-brands fa-whatsapp" aria-hidden="true" />
      </a>
    </div>
  );
}
