import { useEffect, useState } from "react";
import PublicQrShell from "../../components/public/PublicQrShell";
import { useLocale } from "../../context/LocaleContext";
import { fetchPublicFirmMenu, submitFranchiseApply } from "../../utils/qrMenuPublic";

const PHOTOS = [
  { src: "/images/franchise/kiosk.jpg", altKey: "franchise.photoKiosk" },
  { src: "/images/franchise/xirdalan.jpg", altKey: "franchise.photoXirdalan" },
  { src: "/images/franchise/gunesli.jpg", altKey: "franchise.photoGunesli" },
  { src: "/images/franchise/ehmedli.jpg", altKey: "franchise.photoEhmedli" },
];

const WHY = [
  { title: "franchise.whyBrand", text: "franchise.whyBrandText" },
  { title: "franchise.whyPlant", text: "franchise.whyPlantText" },
  { title: "franchise.whyTurnkey", text: "franchise.whyTurnkeyText" },
  { title: "franchise.whyTrain", text: "franchise.whyTrainText" },
  { title: "franchise.whyAds", text: "franchise.whyAdsText" },
  { title: "franchise.whySupport", text: "franchise.whySupportText" },
];

const PACK = [
  "franchise.pack1",
  "franchise.pack2",
  "franchise.pack3",
  "franchise.pack4",
  "franchise.pack5",
  "franchise.pack6",
  "franchise.pack7",
  "franchise.pack8",
];

const STEPS = [
  "franchise.step1",
  "franchise.step2",
  "franchise.step3",
  "franchise.step4",
  "franchise.step5",
];

const EMPTY = {
  name: "",
  phone: "",
  city: "",
  budget: "40-60",
  experience: "no",
  note: "",
};

export default function PublicFranchise() {
  const { t } = useLocale();
  const [firm, setFirm] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    fetchPublicFirmMenu()
      .then((data) => setFirm(data.firm || null))
      .catch(() => setFirm(null));
  }, []);

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setOk(false);
    if (!form.name.trim() || !form.phone.trim() || !form.city.trim()) {
      setError(t("franchise.formNeed"));
      return;
    }
    setBusy(true);
    try {
      await submitFranchiseApply(form);
      setOk(true);
      setForm(EMPTY);
    } catch (err) {
      setError(err.message || t("franchise.formFail"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicQrShell firm={firm}>
      <section
        className="ps-fr-hero"
        style={{ backgroundImage: "url(/images/franchise/kiosk.jpg)" }}
      >
        <div className="ps-wrap ps-fr-hero__copy">
          <p className="ps-fr-kicker">{t("franchise.kicker")}</p>
          <h1>{t("franchise.title")}</h1>
          <p className="ps-fr-lead">{t("franchise.lead")}</p>
          <p className="ps-fr-chips">{t("franchise.chips")}</p>
          <a className="ps-btn" href="#muraciet">
            {t("franchise.cta")}
          </a>
        </div>
      </section>

      <section className="ps-section">
        <div className="ps-wrap ps-fr-intro">
          <p>{t("franchise.intro1")}</p>
          <p>{t("franchise.intro2")}</p>
        </div>
      </section>

      <section className="ps-section">
        <div className="ps-wrap">
          <h2>{t("franchise.whyTitle")}</h2>
          <div className="ps-fr-why">
            {WHY.map((item) => (
              <article key={item.title}>
                <h3>{t(item.title)}</h3>
                <p>{t(item.text)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ps-section">
        <div className="ps-wrap">
          <h2>{t("franchise.photosTitle")}</h2>
          <div className="ps-fr-photos">
            {PHOTOS.map((photo) => (
              <figure key={photo.src}>
                <img src={photo.src} alt={t(photo.altKey)} />
                <figcaption>{t(photo.altKey)}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="ps-section">
        <div className="ps-wrap ps-fr-pack">
          <div>
            <h2>{t("franchise.packTitle")}</h2>
            <p>{t("franchise.packLead")}</p>
            <ul>
              {PACK.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </div>
          <img src="/images/franchise/xirdalan.jpg" alt={t("franchise.photoXirdalan")} />
        </div>
      </section>

      <section className="ps-section">
        <div className="ps-wrap">
          <h2>{t("franchise.howTitle")}</h2>
          <ol className="ps-fr-steps">
            {STEPS.map((key, i) => (
              <li key={key}>
                <b>{String(i + 1).padStart(2, "0")}</b>
                <span>{t(key)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="ps-section">
        <div className="ps-wrap ps-fr-where">
          <div>
            <h2>{t("franchise.whereTitle")}</h2>
            <p>{t("franchise.whereText")}</p>
            <p>{t("franchise.whereCities")}</p>
          </div>
          <img src="/images/franchise/gunesli.jpg" alt={t("franchise.photoGunesli")} />
        </div>
      </section>

      <section className="ps-section" id="muraciet">
        <div className="ps-wrap ps-fr-apply">
          <form className="ps-fr-form" onSubmit={handleSubmit}>
            <h2>{t("franchise.formTitle")}</h2>
            <p>{t("franchise.formLead")}</p>
            <label>
              <span>{t("franchise.formName")}</span>
              <input value={form.name} onChange={setField("name")} autoComplete="name" />
            </label>
            <label>
              <span>{t("franchise.formPhone")}</span>
              <input value={form.phone} onChange={setField("phone")} inputMode="tel" placeholder="+994" autoComplete="tel" />
            </label>
            <label>
              <span>{t("franchise.formCity")}</span>
              <input value={form.city} onChange={setField("city")} />
            </label>
            <label>
              <span>{t("franchise.formBudget")}</span>
              <select value={form.budget} onChange={setField("budget")}>
                <option value="20-40">{t("franchise.budget20")}</option>
                <option value="40-60">{t("franchise.budget40")}</option>
                <option value="60+">{t("franchise.budget60")}</option>
              </select>
            </label>
            <fieldset>
              <legend>{t("franchise.formExp")}</legend>
              <label>
                <input type="radio" name="exp" value="yes" checked={form.experience === "yes"} onChange={setField("experience")} />
                {t("franchise.yes")}
              </label>
              <label>
                <input type="radio" name="exp" value="no" checked={form.experience === "no"} onChange={setField("experience")} />
                {t("franchise.no")}
              </label>
            </fieldset>
            <label>
              <span>{t("franchise.formNote")}</span>
              <textarea rows={3} value={form.note} onChange={setField("note")} />
            </label>
            {error ? <p className="ps-fr-error">{error}</p> : null}
            {ok ? <p className="ps-fr-ok">{t("franchise.formOk")}</p> : null}
            <button type="submit" className="ps-btn" disabled={busy}>
              {busy ? t("common.loading") : t("franchise.cta")}
            </button>
          </form>
          <img src="/images/franchise/ehmedli.jpg" alt={t("franchise.photoEhmedli")} />
        </div>
      </section>
    </PublicQrShell>
  );
}
