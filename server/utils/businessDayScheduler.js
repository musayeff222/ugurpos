import { getDb } from "../db/index.js";
import { getBranchBusinessHours, getBusinessWindowForDate } from "./businessHours.js";
import { closeBusinessDayForBranch } from "./businessDayClose.js";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toMinutes(time) {
  const [h, m] = String(time).split(":").map(Number);
  return h * 60 + m;
}

export function runBusinessDaySchedulerTick() {
  const db = getDb();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = todayISO();

  const branches = db.prepare("SELECT * FROM branches WHERE active = 1").all();
  branches.forEach((branch) => {
    const { openTime, closeTime } = getBranchBusinessHours(branch);
    const closeMin = toMinutes(closeTime);
    if (nowMin < closeMin) return;

    const window = getBusinessWindowForDate(today, openTime, closeTime);
    try {
      closeBusinessDayForBranch(db, branch.id, window.businessDate, now.toISOString());
    } catch (err) {
      console.error("[business-day] close failed", branch.id, err.message);
    }
  });
}

export function startBusinessDayScheduler() {
  const intervalMs = Number(process.env.BUSINESS_DAY_SCHEDULER_MS) || 60_000;
  setInterval(() => {
    try {
      runBusinessDaySchedulerTick();
    } catch (err) {
      console.error("[business-day] scheduler error", err);
    }
  }, intervalMs);
}
