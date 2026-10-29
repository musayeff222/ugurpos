export function isProductionKind(branch) {
  return String(branch?.kind || "").toLowerCase() === "production";
}

export function isFranchiseKind(branch) {
  return String(branch?.kind || "").toLowerCase() === "franchise";
}

export function branchListKind(branch) {
  if (isProductionKind(branch)) return "production";
  if (isFranchiseKind(branch)) return "franchise";
  return "sales";
}

export function adminListPath(kind) {
  if (kind === "production") return "/admin/istehsalat";
  if (kind === "franchise") return "/admin/franchise";
  return "/admin/branches";
}

export function adminRecordPath(branch) {
  if (!branch?.id) return adminListPath(branchListKind(branch));
  if (isProductionKind(branch)) return `/admin/istehsalat/${branch.id}`;
  if (isFranchiseKind(branch)) return `/admin/franchise/${branch.id}`;
  return `/admin/branches/${branch.id}`;
}

export function adminCreatePath(kind) {
  if (kind === "production") return "/admin/istehsalat/new";
  if (kind === "franchise") return "/admin/franchise/ekle";
  return "/admin/branches/new";
}
