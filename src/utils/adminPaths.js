export function isProductionKind(branch) {
  return String(branch?.kind || "").toLowerCase() === "production";
}

export function adminListPath(kind) {
  return kind === "production" ? "/admin/istehsalat" : "/admin/branches";
}

export function adminRecordPath(branch) {
  if (!branch?.id) return adminListPath(isProductionKind(branch) ? "production" : "sales");
  return isProductionKind(branch) ? `/admin/istehsalat/${branch.id}` : `/admin/branches/${branch.id}`;
}

export function adminCreatePath(kind) {
  return kind === "production" ? "/admin/istehsalat/new" : "/admin/branches/new";
}
