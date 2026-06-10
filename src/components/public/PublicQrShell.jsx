import OsesHeader from "./OsesHeader";
import OsesFooter from "./OsesFooter";
import StitchBottomNav from "./StitchBottomNav";
import StitchSocialBar from "./StitchSocialBar";
import { getLastBranchId } from "../../utils/qrMenuStorage";
import "../../styles/oses-theme.css";

export default function PublicQrShell({ firm, branchId, cartCount = 0, navActive = "home", children }) {
  const activeBranchId = branchId || getLastBranchId();

  return (
    <div className="oses-app sf-app">
      <OsesHeader firm={firm} branchId={activeBranchId} cartCount={cartCount} />
      <main className="oses-main sf-main">{children}</main>
      <StitchSocialBar firm={firm} />
      <OsesFooter firm={firm} />
      <StitchBottomNav branchId={activeBranchId} cartCount={cartCount} active={navActive} />
    </div>
  );
}
