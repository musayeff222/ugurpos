import { useLocale } from "../../context/LocaleContext";
import { getBranchLabel } from "../../utils/branchDisplay";

export default function OsesBranchBar({ branch, onBack }) {
  const { t } = useLocale();
  if (!branch) return null;

  return (
    <div className="oses-branch-bar">
      <button type="button" className="oses-branch-bar__back" onClick={onBack} aria-label={t("qr.backToBranches")}>
        <i className="fa fa-arrow-left" />
      </button>
      <div className="oses-branch-bar__info">
        <strong>
          <i className="fa fa-map-marker" /> {getBranchLabel(branch)}
        </strong>
        {branch.address && <small>{branch.address}</small>}
      </div>
      <span className={`oses-pill ${branch.isOpen ? "is-open" : "is-closed"}`}>
        {branch.isOpen ? t("qr.openNow") : t("qr.closedNow")}
      </span>
    </div>
  );
}
