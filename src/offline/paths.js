export const OFFLINE_ALLOWED_PATHS = ["/sales", "/cash-expense", "/expense", "/menu"];

export const offlineNavigation = [
  { labelKey: "nav.sales", path: "/sales", icon: "fa-edit" },
  { label: "Kassadan Xərc", path: "/cash-expense", icon: "fa-money" },
  { labelKey: "nav.expense", path: "/expense", icon: "fa-angle-up" },
];

export function isOfflineAllowedPath(pathname) {
  return OFFLINE_ALLOWED_PATHS.includes(pathname);
}
