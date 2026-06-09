import { useLocale } from "../../context/LocaleContext";
import QrSocialLinks from "./QrSocialLinks";

const DEFAULT_SOCIAL = {
  instagram: "cigkofte",
  tiktok: "cigkofte",
  whatsapp: "",
  facebook: "cigkofte",
};

function mergeSocial(social = {}) {
  const merged = { ...DEFAULT_SOCIAL, ...social };
  return {
    instagram: merged.instagram?.trim() || DEFAULT_SOCIAL.instagram,
    tiktok: merged.tiktok?.trim() || DEFAULT_SOCIAL.tiktok,
    whatsapp: merged.whatsapp?.trim() || "",
    facebook: merged.facebook?.trim() || DEFAULT_SOCIAL.facebook,
  };
}

export default function StitchSocialBar({ firm, className = "" }) {
  const { t } = useLocale();
  const social = mergeSocial(firm?.social);

  return (
    <aside className={`sf-social-bar ${className}`.trim()} aria-label={t("qr.followUs")}>
      <span className="sf-social-bar__label">{t("qr.followUs")}</span>
      <QrSocialLinks social={social} variant="brand" className="sf-social-bar__links" />
    </aside>
  );
}
