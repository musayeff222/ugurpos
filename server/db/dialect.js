export function useMysql() {
  return process.env.DB_DRIVER === "mysql" || !!process.env.MYSQL_HOST;
}

export const sql = {
  date(col) {
    // ISO '2026-09-11T17:47:00.000Z' makes MySQL DATE() NULL; LEFT/substr always yield YYYY-MM-DD.
    return useMysql() ? `LEFT(${col}, 10)` : `substr(${col}, 1, 10)`;
  },
  month(col) {
    return useMysql() ? `LEFT(${col}, 7)` : `substr(${col}, 1, 7)`;
  },
  now() {
    return useMysql() ? "NOW()" : "datetime('now')";
  },
  branchOrder() {
    return useMysql() ? "CAST(code AS UNSIGNED)" : "CAST(code AS INTEGER)";
  },
};
