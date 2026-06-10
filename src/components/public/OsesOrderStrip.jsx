import { ORDER_STRIP_BUTTONS } from "../../utils/cigkofteSiteImages";
import { useLocale } from "../../context/LocaleContext";

export default function OsesOrderStrip({ onOrder, onMenu, onBranches, onCampaigns }) {
  const { t } = useLocale();

  const handlers = {
    order: onOrder,
    menu: onMenu,
    branches: onBranches,
    campaigns: onCampaigns,
  };

  return (
    <section className="oses-order-strip">
      <div className="oses-container">
        <div className="oses-order-strip__grid">
          {ORDER_STRIP_BUTTONS.map((btn) => (
            <button
              key={btn.image}
              type="button"
              className="oses-order-strip__img-btn"
              onClick={handlers[btn.action]}
              aria-label={t(btn.altKey)}
            >
              <img src={btn.image} alt={t(btn.altKey)} loading="lazy" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
