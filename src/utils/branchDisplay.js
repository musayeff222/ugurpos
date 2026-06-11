/** Müşteri tarafında şube adı — #numara gösterilmez */
export function getBranchLabel(branch, fallback = "") {
  if (!branch) return fallback;
  if (typeof branch === "string") return branch.trim() || fallback;
  return (
    branch.name?.trim() ||
    branch.branchName?.trim() ||
    branch.menuTitle?.trim() ||
    fallback
  );
}

/** Admin paneli için şube etiketi — yalnız ad */
export function getBranchAdminLabel(branch, fallback = "") {
  return getBranchLabel(branch, fallback);
}
