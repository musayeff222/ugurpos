import OsesHeader from "./OsesHeader";
import OsesFooter from "./OsesFooter";
import OsesBottomNav from "./OsesBottomNav";
import { getLastBranchId } from "../../utils/qrMenuStorage";
import "../../styles/oses-theme.css";

export default function PublicQrShell({ firm, branchId, cartCount = 0, navActive = "home", children }) {
  const activeBranchId = branchId || getLastBranchId();

  return (
    <div className="oses-app">
      <OsesHeader firm={firm} branchId={activeBranchId} cartCount={cartCount} />
      <main className="oses-main">{children}</main>
      <OsesFooter firm={firm} />
      <OsesBottomNav branchId={activeBranchId} cartCount={cartCount} active={navActive} />
    </div>
  );
}
