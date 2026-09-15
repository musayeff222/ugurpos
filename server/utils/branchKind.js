export function normalizeBranchKind(value) {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  if (v === "production" || v === "istehsalat" || v === "uretim" || v === "üretim") {
    return "production";
  }
  return "sales";
}

export function isProductionBranch(row) {
  return normalizeBranchKind(row?.kind || row?.branchKind) === "production";
}
