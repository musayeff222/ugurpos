export function parseTimeToMinutes(value) {
  if (!value || typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function isMenuOpen(openTime, closeTime, now = new Date()) {
  const open = parseTimeToMinutes(openTime);
  const close = parseTimeToMinutes(closeTime);
  if (open === null || close === null) return true;

  const current = now.getHours() * 60 + now.getMinutes();
  if (open === close) return true;
  if (open < close) return current >= open && current < close;
  return current >= open || current < close;
}

export function resolveMenuHours(branchRow, firmRow) {
  return {
    openTime: branchRow?.menu_open_time || firmRow?.menu_open_time || "09:00",
    closeTime: branchRow?.menu_close_time || firmRow?.menu_close_time || "23:00",
  };
}
