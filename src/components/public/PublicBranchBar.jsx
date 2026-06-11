import StitchIcon from "./StitchIcon";
import { useLocale } from "../../context/LocaleContext";
import { getBranchLabel } from "../../utils/branchDisplay";

export default function PublicBranchBar({ branch, onBack }) {
  const { t } = useLocale();
  if (!branch) return null;

  return (
    <div className="sf-branch-bar">
      <button type="button" className="sf-branch-bar__back" onClick={onBack} aria-label={t("qr.backToBranches")}>
        <StitchIcon name="arrow_back" />
      </button>
      <div className="sf-branch-bar__info">
        <div className="sf-branch-bar__location">
          <StitchIcon name="location_on" filled />
          <span>{getBranchLabel(branch)}</span>
        </div>
        {branch.address && <small>{branch.address}</small>}
      </div>
      <span className={`sf-pill ${branch.isOpen ? "is-open" : "is-closed"}`}>
        {branch.isOpen ? t("qr.openNow") : t("qr.closedNow")}
      </span>
    </div>
  );
}
