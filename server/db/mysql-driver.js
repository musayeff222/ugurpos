import mysql from "mysql2/promise";
import deasync from "deasync";

function awaitSync(promise) {
  let done = false;
  let result;
  let error;
  promise
    .then((value) => {
      result = value;
      done = true;
    })
    .catch((err) => {
      error = err;
      done = true;
    });
  deasync.loopWhile(() => !done);
  if (error) throw error;
  return result;
}

function createStatement(executor, sql) {
  const trimmed = sql.trim();
  return {
    get(...params) {
      const [rows] = awaitSync(executor(trimmed, params));
      return rows[0] || undefined;
    },
    all(...params) {
      const [rows] = awaitSync(executor(trimmed, params));
      return rows;
    },
    run(...params) {
      const [result] = awaitSync(executor(trimmed, params));
      return {
        changes: result.affectedRows ?? 0,
        lastInsertRowid: result.insertId ?? 0,
      };
    },
  };
}

class MysqlDb {
  constructor(pool) {
    this.dialect = "mysql";
    this.pool = pool;
    this._txConn = null;
  }

  _executor() {
    if (this._txConn) {
      return (sql, params) => this._txConn.execute(sql, params);
    }
    return (sql, params) => this.pool.execute(sql, params);
  }

  prepare(sql) {
    return createStatement(this._executor(), sql);
  }

  exec(sql) {
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    const run = this._txConn
      ? (statement) => awaitSync(this._txConn.query(statement))
      : (statement) => awaitSync(this.pool.query(statement));
    for (const statement of statements) {
      run(statement);
    }
  }

  transaction(fn) {
    const conn = awaitSync(this.pool.getConnection());
    const previous = this._txConn;
    this._txConn = conn;
    awaitSync(conn.beginTransaction());
    try {
      fn();
      awaitSync(conn.commit());
    } catch (err) {
      awaitSync(conn.rollback());
      throw err;
    } finally {
      this._txConn = previous;
      conn.release();
    }
  }
}

export function createMysqlDb(config) {
  const pool = mysql.createPool({
    host: config.host,
    port: Number(config.port) || 3306,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    charset: "utf8mb4",
    dateStrings: true,
    enableKeepAlive: true,
    ...(config.socketPath ? { socketPath: config.socketPath } : {}),
  });

  const db = new MysqlDb(pool);
  try {
    awaitSync(pool.query("SELECT 1"));
  } catch (err) {
    if (err.code === "ER_ACCESS_DENIED_ERROR") {
      throw new Error(
        `MySQL erisim reddedildi (${config.user}@${config.host}/${config.database}). ` +
          "Hostinger hPanel: MYSQL_HOST=127.0.0.1 kullanin, kullanici sifresini ve veritabani atamasini kontrol edin."
      );
    }
    if (err.code === "ER_BAD_DB_ERROR") {
      throw new Error(
        `MySQL veritabani bulunamadi: ${config.database}. hPanel'den veritabani olusturup MYSQL_DATABASE ile eslestirin.`
      );
    }
    throw err;
  }
  return db;
}

/** Hostinger'da localhost → ::1 olur; MySQL kullanicisi genelde 127.0.0.1 icin tanimlidir. */
export function resolveMysqlHost(host) {
  const value = String(host || process.env.MYSQL_HOST || "127.0.0.1").trim();
  if (!value || value === "localhost") return "127.0.0.1";
  return value;
}

export function getMysqlConfigFromEnv() {
  const socketPath = process.env.MYSQL_SOCKET?.trim();
  return {
    host: resolveMysqlHost(process.env.MYSQL_HOST),
    port: process.env.MYSQL_PORT || 3306,
    user: (process.env.MYSQL_USER || "").trim(),
    password: process.env.MYSQL_PASSWORD ?? "",
    database: (process.env.MYSQL_DATABASE || "ugurpos").trim(),
    ...(socketPath ? { socketPath } : {}),
  };
}
