import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DEFAULT_MENU_WEB_CONFIG, isWebItemEnabled } from "../../utils/menuWebConfig";

const FALLBACK_SLIDES = DEFAULT_MENU_WEB_CONFIG.promoSlides.map((s) => ({
  src: s.imageUrl,
  alt: s.alt,
  href: null,
}));

export default function OsesPromoSlider({ slides, onSlideClick }) {
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
    const timer = setInterval(() => setIndex((i) => (i + 1) % slideList.length), 5000);
    return () => clearInterval(timer);
  }, [slideList.length]);

  if (slideList.length === 0) return null;

  return (
    <div className="promo low">
      <ul id="promo">
        {slideList.map((slide, i) => {
          const content = (
            <img
              src={slide.src}
              alt={slide.alt}
              role={onSlideClick ? "button" : undefined}
              onClick={onSlideClick ? () => onSlideClick(slide, i) : undefined}
              style={onSlideClick ? { cursor: "pointer" } : undefined}
            />
          );
          return (
            <li key={slide.id || `${slide.src}-${i}`} className={i === index ? "is-active" : ""}>
              {slide.href ? <Link to={slide.href}>{content}</Link> : content}
            </li>
          );
        })}
      </ul>
      {slideList.length > 1 && (
        <ul className="oses-promo-dots">
          {slideList.map((slide, i) => (
            <li key={`dot-${slide.src}-${i}`} className={i === index ? "is-active" : ""}>
              <button type="button" aria-label={`Slide ${i + 1}`} onClick={() => setIndex(i)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
