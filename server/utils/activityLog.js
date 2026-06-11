import { uid } from "../db/index.js";

export function logActivity(db, entry) {
  const {
    firmId,
    branchId = null,
    branchName = null,
    type,
    title,
    detail = null,
    refId = null,
  } = entry;

  if (!firmId || !type || !title) return null;

  const id = uid("act");
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO activity_logs (id, firm_id, branch_id, branch_name, type, title, detail, ref_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, firmId, branchId, branchName, type, title, detail, refId, createdAt);

  return id;
}

export function listActivityLogs(db, firmId, { limit = 50, after = null } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);

  if (after) {
    return db
      .prepare(
        `SELECT * FROM activity_logs
         WHERE firm_id = ? AND created_at > ?
         ORDER BY created_at ASC
         LIMIT ?`
      )
      .all(firmId, after, safeLimit);
  }

  return db
    .prepare(
      `SELECT * FROM activity_logs
       WHERE firm_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(firmId, safeLimit);
}

export function rowToActivityLog(row) {
  if (!row) return null;
  return {
    id: row.id,
    firmId: row.firm_id,
    branchId: row.branch_id || null,
    branchName: row.branch_name || null,
    type: row.type,
    title: row.title,
    detail: row.detail || "",
    refId: row.ref_id || null,
    createdAt: row.created_at,
  };
}
