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

/** Admin paneli için dahili etiket (numara + ad) */
export function getBranchAdminLabel(branch, fallback = "") {
  if (!branch) return fallback;
  const name = getBranchLabel(branch, fallback);
  if (!branch.branchNo) return name;
  return `#${branch.branchNo} ${name}`;
}
