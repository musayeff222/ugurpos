import { useEffect, useState } from "react";
import { useLocale } from "../../context/LocaleContext";
import { elT } from "../../i18n/eleman";
import {
  canInstallEleman,
  initElemanPwa,
  installElemanApp,
  isAndroidDevice,
  isElemanStandalone,
  isInAppBrowser,
  isIosDevice,
  openElemanInChrome,
  subscribeElemanInstall,
} from "../../utils/elemanPwa";

export default function ElemanAnaEkran() {
  const { lang } = useLocale();
  const t = (key) => elT(lang, key);
  const [, setCanInstall] = useState(canInstallEleman());
  const [busy, setBusy] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const [message, setMessage] = useState("");
  const standalone = isElemanStandalone();

  useEffect(() => {
    initElemanPwa();
    return subscribeElemanInstall(setCanInstall);
  }, []);

  const install = async () => {
    setMessage("");
    if (standalone) return;
    if (isIosDevice()) {
      setIosHelp(true);
      return;
    }
    if (isInAppBrowser()) {
      if (isAndroidDevice()) openElemanInChrome();
      else setMessage(t("install.openChrome"));
      return;
    }
    setBusy(true);
    try {
      const result = await installElemanApp();
      if (result.ok) return;
      if (result.reason === "dismissed") return;
      setMessage(t("install.openChrome"));
    } finally {
      setBusy(false);
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
          <p className="el-install__ok">{t("install.done")}</p>
        ) : (
          <button type="button" className="el-install__btn" onClick={install} disabled={busy}>
            {busy ? t("install.busy") : t("install.button")}
          </button>
        )}
        {message ? <p className="el-install__msg">{message}</p> : null}
      </article>
      {iosHelp ? (
        <div className="el-ios" role="dialog" aria-modal="true">
          <button type="button" className="el-ios__dim" aria-label={t("menu.close")} onClick={() => setIosHelp(false)} />
          <div className="el-ios__sheet">
            <strong>{t("install.iosTitle")}</strong>
            <p>{t("install.iosWhy")}</p>
            <div className="el-ios__pick">
              <i className="fa-solid fa-square-plus" />
              <span>{t("install.iosAction")}</span>
            </div>
            <ol>
              <li>{t("install.ios1")}</li>
              <li>{t("install.ios2")}</li>
              <li>{t("install.ios3")}</li>
            </ol>
            <button type="button" className="el-install__btn" onClick={() => setIosHelp(false)}>
              {t("menu.close")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
