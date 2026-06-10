import { useEffect, useState } from "react";
import { useLocale } from "../../context/LocaleContext";
import { HERO_SLIDES } from "../../utils/cigkofteSiteImages";

export default function OsesHeroSlider({ onOrder, onMenu }) {
  const { t } = useLocale();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = HERO_SLIDES[index];

  return (
    <section className="oses-hero">
      {HERO_SLIDES.map((item, i) => (
        <div
          key={item.image}
          className={`oses-hero__slide${i === index ? " is-active" : ""}`}
          style={{ backgroundImage: `url(${item.image})` }}
        />
      ))}
      <div className="oses-hero__overlay" />
      <div className="oses-container oses-hero__content">
        <p className="oses-hero__eyebrow">{t("qr.osesHeroEyebrow")}</p>
        <h1>{t(slide.titleKey)}</h1>
        <p>{t(slide.subtitleKey)}</p>
        <div className="oses-hero__actions">
          <button type="button" className="oses-btn oses-btn--primary" onClick={onOrder}>
            {t("qr.osesOrderNow")}
          </button>
          <button type="button" className="oses-btn oses-btn--outline" onClick={onMenu}>
            {t("qr.viewMenu")}
          </button>
        </div>
      </div>
      <div className="oses-hero__dots">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            className={i === index ? "is-active" : ""}
            onClick={() => setIndex(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
