function pad2(n) {
  return String(n).padStart(2, "0");
}

export function normalizeTime(value, fallback = "08:00") {
  const raw = String(value || fallback).trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  const h = Math.min(23, Math.max(0, Number(match[1])));
  const m = Math.min(59, Math.max(0, Number(match[2])));
  return `${pad2(h)}:${pad2(m)}`;
}

export function getBranchBusinessHours(branchRow) {
  return {
    openTime: normalizeTime(branchRow?.business_open_time || branchRow?.menu_open_time, "08:00"),
    closeTime: normalizeTime(branchRow?.business_close_time || branchRow?.menu_close_time, "17:00"),
  };
}

function toMinutes(time) {
  const [h, m] = normalizeTime(time).split(":").map(Number);
  return h * 60 + m;
}

function dateISO(d = new Date()) {
  const y = d.getFullYear();
  const mo = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${mo}-${day}`;
}

function shiftDateISO(dateStr, deltaDays) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return dateISO(d);
}

export function getBusinessWindowForDate(businessDate, openTime, closeTime) {
  const open = normalizeTime(openTime);
  const close = normalizeTime(closeTime);
  return {
    businessDate,
    openTime: open,
    closeTime: close,
    start: `${businessDate}T${open}:00`,
    end: `${businessDate}T${close}:00`,
  };
}

export function getActiveBusinessWindow(branchRow, now = new Date()) {
  const { openTime, closeTime } = getBranchBusinessHours(branchRow);
  const today = dateISO(now);
  const yesterday = shiftDateISO(today, -1);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const openMin = toMinutes(openTime);
  const closeMin = toMinutes(closeTime);

  if (nowMin < openMin) {
    return getBusinessWindowForDate(yesterday, openTime, closeTime);
  }
  return getBusinessWindowForDate(today, openTime, closeTime);
}

export function isTimestampInWindow(createdAt, window) {
  if (!createdAt || !window) return false;
  const day = createdAt.slice(0, 10);
  const time = createdAt.length >= 16 ? createdAt.slice(11, 16) : "00:00";
  if (day !== window.businessDate) return false;
  const tMin = toMinutes(time);
  return tMin >= toMinutes(window.openTime) && tMin <= toMinutes(window.closeTime);
}

export function isDateInBusinessRange(dateStr, startBusinessDate, endBusinessDate) {
  return dateStr >= startBusinessDate && dateStr <= endBusinessDate;
}
