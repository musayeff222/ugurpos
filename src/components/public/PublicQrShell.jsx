import LanguageSwitcher from "./LanguageSwitcher";
import PublicSiteHeader from "./PublicSiteHeader";
import PublicWebHeaderNav from "./PublicWebHeaderNav";
import { getLastBranchId } from "../../utils/qrMenuStorage";
import { useLocale } from "../../context/LocaleContext";

export default function PublicQrShell({ firm, branchId, cartCount = 0, navActive = "home", children }) {
  const { t } = useLocale();
  const theme = firm?.theme || "classic";
  const activeBranchId = branchId || getLastBranchId();

  return (
    <div className="public-web-app">
      <div className="public-web-lang-bar">
        <span className="public-web-lang-bar__label">{t("qr.badge")}</span>
        <LanguageSwitcher compact />
      </div>

      <div className={`public-web-body qr-theme-${theme}`}>
        <PublicSiteHeader firm={firm} />
        <main className="public-web-main">{children}</main>
      </div>

      <PublicWebHeaderNav
        branchId={activeBranchId}
        cartCount={cartCount}
        active={navActive}
        variant="bottom"
      />
    </div>
  );
}
