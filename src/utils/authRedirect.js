export function isProductionAccount(account) {
  return String(account?.branchKind || "").toLowerCase() === "production";
}

export function isKasiyerAccount(account) {
  return (
    (account?.loginType === "staff" || account?.role === "staff") &&
    String(account?.staffRole || "").toLocaleLowerCase("tr").includes("kasiyer")
  );
}

export function isStaffAccount(account) {
  return account?.loginType === "staff" || account?.role === "staff";
}

const LOGIN_PREFIX = "/login";

export function loginPathForAccount(account) {
  if (account?.role === "admin" && !account?.impersonating && account?.loginType !== "branch" && !isStaffAccount(account)) {
    return "/login/admin";
  }
  if (isStaffAccount(account)) return isKasiyerAccount(account) ? "/login/kasiyer" : "/login/persenol";
  if (isProductionAccount(account)) return "/login/istesalat";
  return "/login/sube";
}

export function getPostLoginPath(account, fromPath) {
  if (isProductionAccount(account) && !isStaffAccount(account)) return "/istehsalat";
  if (isKasiyerAccount(account)) return "/sales";
  if (fromPath && !String(fromPath).startsWith(LOGIN_PREFIX)) return fromPath;
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 991px)").matches;
  return isMobile ? "/menu" : "/dashboard";
}
