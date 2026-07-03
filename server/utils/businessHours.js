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
  const endDate = toMinutes(close) <= toMinutes(open) ? shiftDateISO(businessDate, 1) : businessDate;
  return {
    businessDate,
    openTime: open,
    closeTime: close,
    endDate,
    start: `${businessDate}T${open}:00`,
    end: `${endDate}T${close}:00`,
  };
}

export function getReportRangeForBusinessDate(businessDate, openTime, closeTime) {
  const window = getBusinessWindowForDate(businessDate, openTime, closeTime);
  return {
    businessDate,
    startDate: businessDate,
    endDate: window.endDate,
    startTime: window.openTime,
    endTime: window.closeTime,
  };
}

function toLocalMs(dateStr, timeStr) {
  return new Date(`${dateStr}T${normalizeTime(timeStr)}:00`).getTime();
}

export function isTimestampInReportRange(createdAt, startDate, endDate, startTime, endTime) {
  const local = parseLocalTimestamp(createdAt);
  if (!local) return false;
  const ts = toLocalMs(local.date, local.time);
  const start = toLocalMs(startDate, startTime);
  const end = toLocalMs(endDate, endTime);
  return ts >= start && ts <= end;
}

export function formatReportRangeLabel(range) {
  if (!range) return "";
  if (range.startDate === range.endDate) {
    return `${range.startDate} ${range.startTime} – ${range.endTime}`;
  }
  return `${range.startDate} ${range.startTime} – ${range.endDate} ${range.endTime}`;
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

export function parseLocalTimestamp(createdAt) {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: dateISO(d),
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
    minutes: d.getHours() * 60 + d.getMinutes(),
  };
}

export function isTimestampInWindow(createdAt, window, options = {}) {
  if (!createdAt || !window) return false;
  const local = parseLocalTimestamp(createdAt);
  if (!local) return false;
  const endDate = window.endDate || window.businessDate;

  if (options.ignoreClose && endDate === window.businessDate) {
    if (local.date !== window.businessDate) return false;
    return local.minutes >= toMinutes(window.openTime);
  }

  return isTimestampInReportRange(
    createdAt,
    window.businessDate,
    endDate,
    window.openTime,
    window.closeTime
  );
}

export function isDateInBusinessRange(dateStr, startBusinessDate, endBusinessDate) {
  return dateStr >= startBusinessDate && dateStr <= endBusinessDate;
}
