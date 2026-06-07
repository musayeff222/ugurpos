import { useLocale } from "../../context/LocaleContext";

export default function LanguageSwitcher({ compact = false }) {
  const { lang, setLang, t } = useLocale();

  return (
    <div className={`lang-switcher ${compact ? "lang-switcher--compact" : ""}`.trim()} role="group" aria-label="Language">
      {["az", "tr"].map((code) => (
        <button
          key={code}
          type="button"
          className={lang === code ? "active" : ""}
          onClick={() => setLang(code)}
        >
          {t(`lang.${code}`)}
        </button>
      ))}
    </div>
  );
}
