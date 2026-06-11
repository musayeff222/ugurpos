import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "../../context/LocaleContext";
import { getWebConfig } from "../../utils/menuWebConfig";

const INTRO_SESSION_KEY = "ugurpos_wa_float_intro";
const INTRO_DELAY_MS = 5000;
const SCROLL_SHOW_DELAY_MS = 8000;

function WhatsappIcon() {
  return (
    <svg className="wa-float__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

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
        <WhatsappIcon />
      </a>
    </div>
  );
}
