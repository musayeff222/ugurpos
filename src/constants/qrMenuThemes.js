export const QR_MENU_THEMES = [
  {
    id: "classic",
    preview: "linear-gradient(145deg, #8b1a12 0%, #c0392b 45%, #e74c3c 100%)",
    swatch: ["#c0392b", "#e74c3c", "#fff8f5"],
  },
  {
    id: "dark",
    preview: "linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
    swatch: ["#1e293b", "#f59e0b", "#0b1220"],
  },
  {
    id: "fresh",
    preview: "linear-gradient(145deg, #0d5c4a 0%, #10b981 50%, #34d399 100%)",
    swatch: ["#10b981", "#059669", "#ecfdf5"],
  },
  {
    id: "elegant",
    preview: "linear-gradient(145deg, #1e3a5f 0%, #2563eb 45%, #d4af37 100%)",
    swatch: ["#1e3a5f", "#d4af37", "#f8fafc"],
  },
];

export const DEFAULT_QR_MENU_THEME = "classic";

export function normalizeQrMenuTheme(value) {
  const id = String(value || DEFAULT_QR_MENU_THEME).toLowerCase();
  return QR_MENU_THEMES.some((t) => t.id === id) ? id : DEFAULT_QR_MENU_THEME;
}
