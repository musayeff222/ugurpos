export function useMysql() {
  return process.env.DB_DRIVER === "mysql" || !!process.env.MYSQL_HOST;
}

export const sql = {
  date(col) {
    return useMysql() ? `DATE(${col})` : `date(${col})`;
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
