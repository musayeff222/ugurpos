import { uid } from "../db/index.js";
import { sql as SQL } from "../db/dialect.js";
import { localDateISO } from "./businessHours.js";

export function openStaffShift(db, { staffId, branchId, staffName }) {
  if (!staffId || !branchId) return null;
  try {
    const open = db
      .prepare("SELECT * FROM staff_shifts WHERE staff_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1")
      .get(staffId);
    if (open) return open;
    const id = uid("sh");
    const startedAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO staff_shifts (id, staff_id, branch_id, staff_name, started_at, ended_at)
       VALUES (?, ?, ?, ?, ?, NULL)`
    ).run(id, staffId, branchId, staffName || "", startedAt);
    return db.prepare("SELECT * FROM staff_shifts WHERE id = ?").get(id);
  } catch {
    return null;
  }
}

export function closeStaffShift(db, staffId) {
  if (!staffId) return null;
  try {
    const open = db
      .prepare("SELECT * FROM staff_shifts WHERE staff_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1")
      .get(staffId);
    if (!open) return null;
    const endedAt = new Date().toISOString();
    db.prepare("UPDATE staff_shifts SET ended_at = ? WHERE id = ?").run(endedAt, open.id);
    return db.prepare("SELECT * FROM staff_shifts WHERE id = ?").get(open.id);
  } catch {
    return null;
  }
}

function hoursBetween(start, end) {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return Math.round(((b - a) / 3600000) * 100) / 100;
}

export function staffWorkHoursToday(db, staffId, branchId, staffNames = []) {
  const today = localDateISO();
  let hours = 0;
  try {
    const shifts = db
      .prepare(
        `SELECT started_at, ended_at FROM staff_shifts
         WHERE staff_id = ? AND ${SQL.date("started_at")} = ?`
      )
      .all(staffId, today);
    shifts.forEach((row) => {
      hours += hoursBetween(row.started_at, row.ended_at || new Date().toISOString());
    });
  } catch {
    /* table missing */
  }

  if (hours > 0 || !staffNames.length || !branchId) {
    return Math.round(hours * 100) / 100;
  }

  // Fallback: first→last sale timespan for today
  try {
    const placeholders = staffNames.map(() => "?").join(", ");
    const row = db
      .prepare(
        `SELECT MIN(created_at) as first_at, MAX(created_at) as last_at
         FROM sales
         WHERE branch_id = ? AND ${SQL.date("created_at")} = ? AND payment_type != 'refund'
           AND staff_name IN (${placeholders})`
      )
      .get(branchId, today, ...staffNames);
    if (row?.first_at && row?.last_at) {
      return hoursBetween(row.first_at, row.last_at) || 0.01;
    }
  } catch {
    /* ignore */
  }
  return 0;
}

export function staffWorkHoursMonth(db, staffId) {
  const month = localDateISO().slice(0, 7);
  let hours = 0;
  try {
    const shifts = db
      .prepare(
        `SELECT started_at, ended_at FROM staff_shifts
         WHERE staff_id = ? AND ${SQL.month("started_at")} = ?`
      )
      .all(staffId, month);
    shifts.forEach((row) => {
      hours += hoursBetween(row.started_at, row.ended_at || new Date().toISOString());
    });
  } catch {
    /* ignore */
  }
  return Math.round(hours * 100) / 100;
}
