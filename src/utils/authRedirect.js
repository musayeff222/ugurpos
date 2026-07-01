export function getPostLoginPath(account, fromPath) {
  const isKasiyer =
    account?.loginType === "staff" &&
    String(account?.staffRole || "").toLocaleLowerCase("tr").includes("kasiyer");
  if (isKasiyer) return "/sales";
  if (fromPath && fromPath !== "/login") return fromPath;
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 991px)").matches;
  return isMobile ? "/menu" : "/dashboard";
}
