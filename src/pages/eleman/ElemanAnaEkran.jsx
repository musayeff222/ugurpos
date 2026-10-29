import { useEffect, useState } from "react";
import { useLocale } from "../../context/LocaleContext";
import { elT } from "../../i18n/eleman";
import {
  canInstallEleman,
  installElemanApp,
  isElemanStandalone,
  subscribeElemanInstall,
} from "../../utils/elemanPwa";

export default function ElemanAnaEkran() {
  const { lang } = useLocale();
  const t = (key) => elT(lang, key);
  const [, setCanInstall] = useState(canInstallEleman());
  const standalone = isElemanStandalone();

  useEffect(() => subscribeElemanInstall(setCanInstall), []);

  const install = async () => {
    const ok = await installElemanApp();
    if (!ok && !canInstallEleman()) {
      window.alert(t("install.chrome"));
    }
  };

  return (
    <div className="el-page">
      <div className="el-pagehead">
        <div>
          <h2>{t("install.title")}</h2>
          <p>{t("install.hint")}</p>
        </div>
      </div>
      <article className="el-install">
        <img src="/icons/cigkofte-192.png" alt="İstanbul Çiğköfte" />
        <strong>İstanbul Çiğköfte</strong>
        <small>Əlman</small>
        {standalone ? (
          <p>{t("install.done")}</p>
        ) : (
          <>
            <button type="button" className="el-login__submit" onClick={install}>
              {t("install.button")}
            </button>
            <p>{t("install.chrome")}</p>
            <p>{t("install.ios")}</p>
          </>
        )}
      </article>
    </div>
  );
}
