import { useLocale } from "../../context/LocaleContext";

export default function PublicBranchBar({ branch, onBack }) {
  const { t } = useLocale();
  if (!branch) return null;

  const isOpen = branch.isOpen !== false;

  return (
    <div className="public-branch-bar">
      <button type="button" className="public-branch-bar__back" onClick={onBack}>
        <i className="fa fa-arrow-left" />
      </button>
      <div className="public-branch-bar__info">
        <strong>
          #{branch.branchNo} {branch.name}
        </strong>
        <span className={`public-branch-hours-pill ${isOpen ? "open" : "closed"}`}>
          {isOpen ? t("qr.openNow") : t("qr.closedNow")}
        </span>
        {branch.address && <small>{branch.address}</small>}
      </div>
    </div>
  );
}
