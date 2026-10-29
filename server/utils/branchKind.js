export function normalizeBranchKind(value) {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  if (v === "production" || v === "istehsalat" || v === "uretim" || v === "üretim") {
    return "production";
  }
  if (v === "franchise" || v === "fransiz" || v === "franşiz") {
    return "franchise";
  }
  return "sales";
}

export function isProductionBranch(row) {
  return normalizeBranchKind(row?.kind || row?.branchKind) === "production";
}

export function isFranchiseBranch(row) {
  return normalizeBranchKind(row?.kind || row?.branchKind) === "franchise";
}
