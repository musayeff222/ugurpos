import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DEFAULT_MENU_WEB_CONFIG, isWebItemEnabled } from "../../utils/menuWebConfig";
import { useLocale } from "../../context/LocaleContext";

const FALLBACK_SLIDES = DEFAULT_MENU_WEB_CONFIG.promoSlides.map((s) => ({
  src: s.imageUrl,
  alt: s.alt,
  href: null,
}));

export default function OsesPromoSlider({ slides, onOrder, onBranches }) {
  const { t } = useLocale();
  const slideList = useMemo(() => {
    const list = slides?.length
      ? slides
          .filter((s) => (s.imageUrl || s.src) && isWebItemEnabled(s))
          .map((s) => ({
            id: s.id,
            src: s.imageUrl || s.src,
            alt: s.alt || "",
            href: s.href || null,
          }))
      : FALLBACK_SLIDES;
    return list.filter((s) => s.src);
  }, [slides]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [slideList.length]);

  useEffect(() => {
    if (slideList.length <= 1) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slideList.length), 5500);
    return () => clearInterval(timer);
  }, [slideList.length]);

  if (slideList.length === 0) return null;

  return (
    <section className="ps-hero">
      <ul>
        {slideList.map((slide, i) => {
          const img = <img src={slide.src} alt={slide.alt} />;
          return (
            <li key={slide.id || `${slide.src}-${i}`} className={i === index ? "is-active" : ""}>
              {slide.href ? <Link to={slide.href}>{img}</Link> : img}
            </li>
          );
        })}
      </ul>
      <div className="ps-hero__shade" />
      <div className="ps-hero__copy">
        <span className="ps-kicker">{t("qr.osesHeroEyebrow")}</span>
        <h1>{t("qr.heroLead")}</h1>
        <p>{t("qr.heroHint")}</p>
        <div className="ps-hero__actions">
          <button type="button" className="ps-btn" onClick={onOrder}>
            {t("qr.orderNow")}
          </button>
          <button type="button" className="ps-btn ps-btn-ghost" style={{ color: "#fff", borderColor: "rgba(255,255,255,.35)" }} onClick={onBranches}>
            {t("qr.nav.branches")}
          </button>
        </div>
      </div>
      {slideList.length > 1 && (
        <div className="ps-dots">
          {slideList.map((slide, i) => (
            <button
              key={`dot-${slide.src}-${i}`}
              type="button"
              className={i === index ? "is-active" : ""}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
