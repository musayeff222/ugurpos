export const QR_MENU_THEMES = ["classic", "dark", "fresh", "elegant"];
export const DEFAULT_QR_MENU_THEME = "classic";

export function normalizeMenuTheme(value, fallback = DEFAULT_QR_MENU_THEME) {
  const id = String(value || fallback).toLowerCase();
  return QR_MENU_THEMES.includes(id) ? id : fallback;
}
