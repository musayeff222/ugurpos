import { Link } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";
import PublicSiteHeader from "./PublicSiteHeader";
import PublicWebHeaderNav from "./PublicWebHeaderNav";
import { getLastBranchId } from "../../utils/qrMenuStorage";

export default function PublicQrShell({ firm, branchId, cartCount = 0, navActive = "home", children }) {
  const activeBranchId = branchId || getLastBranchId();

  return (
    <div className="stitch-app">
      <div className="stitch-app__top">
        <LanguageSwitcher compact />
      </div>

      <PublicSiteHeader firm={firm} />

      <main className="stitch-main">{children}</main>

      <PublicWebHeaderNav branchId={activeBranchId} cartCount={cartCount} active={navActive} />
    </div>
  );
}
