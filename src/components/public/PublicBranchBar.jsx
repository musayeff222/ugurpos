import { useLocale } from "../../context/LocaleContext";

export default function PublicBranchBar({ branch, onBack }) {
  const { t } = useLocale();
  if (!branch) return null;

  const isOpen = branch.isOpen !== false;

  return (
    <div className="stitch-branch-bar">
      <button type="button" className="stitch-branch-bar__back" onClick={onBack} aria-label={t("qr.backToBranches")}>
        <i className="fa fa-arrow-left" />
      </button>
      <div className="stitch-branch-bar__info">
        <span className="stitch-branch-bar__location">
          <i className="fa fa-map-marker" />
          #{branch.branchNo} {branch.name}
        </span>
        {branch.address && <small>{branch.address}</small>}
      </div>
      <span className={`stitch-pill ${isOpen ? "is-open" : "is-closed"}`}>
        {isOpen ? t("qr.openNow") : t("qr.closedNow")}
      </span>
    </div>
  );
}
