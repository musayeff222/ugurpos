export function isProductionAccount(account) {
  return String(account?.branchKind || "").toLowerCase() === "production";
}

export function getPostLoginPath(account, fromPath) {
  if (isProductionAccount(account)) return "/istehsalat";
  const isKasiyer =
    account?.loginType === "staff" &&
    String(account?.staffRole || "").toLocaleLowerCase("tr").includes("kasiyer");
  if (isKasiyer) return "/sales";
  if (fromPath && fromPath !== "/login" && fromPath !== "/login/admin") return fromPath;
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 991px)").matches;
  return isMobile ? "/menu" : "/dashboard";
}
