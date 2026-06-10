import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const SLIDES = [
  { src: "/oses/photos/promo/promo-3.jpg", alt: "Çiğ Köfteler İkiye Ayrılır", href: null },
  { src: "/oses/photos/promo/promo-1.jpg", alt: "Cigkofte", href: null },
  { src: "/oses/photos/promo/promo-2.jpg", alt: "Cigkofte", href: null },
];

export default function OsesPromoSlider({ onSlideClick }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="promo low">
      <ul id="promo">
        {SLIDES.map((slide, i) => {
          const content = <img src={slide.src} alt={slide.alt} />;
          return (
            <li key={slide.src} className={i === index ? "is-active" : ""}>
              {slide.href ? <Link to={slide.href}>{content}</Link> : content}
            </li>
          );
        })}
      </ul>
      <ul className="oses-promo-dots">
        {SLIDES.map((slide, i) => (
          <li key={slide.src} className={i === index ? "is-active" : ""}>
            <button type="button" aria-label={`Slide ${i + 1}`} onClick={() => setIndex(i)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
