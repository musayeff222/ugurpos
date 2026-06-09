import StitchAppBar from "./StitchAppBar";
import StitchBottomNav from "./StitchBottomNav";
import StitchFooter from "./StitchFooter";
import { getLastBranchId } from "../../utils/qrMenuStorage";

export default function PublicQrShell({ firm, branchId, cartCount = 0, navActive = "home", children }) {
  const activeBranchId = branchId || getLastBranchId();

  return (
    <div className="sf-app">
      <StitchAppBar firm={firm} branchId={activeBranchId} cartCount={cartCount} />
      <main className="sf-main">{children}</main>
      <StitchFooter firm={firm} />
      <StitchBottomNav branchId={activeBranchId} cartCount={cartCount} active={navActive} />
    </div>
  );
}
