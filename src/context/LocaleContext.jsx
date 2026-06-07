import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { translate } from "../i18n/translations";

const LocaleContext = createContext(null);
const LANG_KEY = "ugurpos_lang";

export function LocaleProvider({ children, initialLang }) {
  const [lang, setLangState] = useState(() => {
    if (typeof window === "undefined") return initialLang || "az";
    return localStorage.getItem(LANG_KEY) || initialLang || "az";
  });

  const setLang = useCallback((next) => {
    setLangState(next);
    localStorage.setItem(LANG_KEY, next);
  }, []);

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
