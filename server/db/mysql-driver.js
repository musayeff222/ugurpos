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

class MysqlStatement {
  constructor(conn, sql) {
    this.conn = conn;
    this.sql = sql.trim();
  }

  get(...params) {
    const [rows] = awaitSync(this.conn.execute(this.sql, params));
    return rows[0] || undefined;
  }

  all(...params) {
    const [rows] = awaitSync(this.conn.execute(this.sql, params));
    return rows;
  }

  run(...params) {
    const [result] = awaitSync(this.conn.execute(this.sql, params));
    return {
      changes: result.affectedRows ?? 0,
      lastInsertRowid: result.insertId ?? 0,
    };
  }
}

class MysqlDb {
  constructor(pool) {
    this.dialect = "mysql";
    this.pool = pool;
    this._conn = null;
  }

  _connection() {
    if (!this._conn) {
      this._conn = awaitSync(this.pool.getConnection());
    }
    return this._conn;
  }

  prepare(sql) {
    return new MysqlStatement(this._connection(), sql);
  }

  exec(sql) {
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    const conn = this._connection();
    for (const statement of statements) {
      awaitSync(conn.query(statement));
    }
  }

  transaction(fn) {
    const conn = awaitSync(this.pool.getConnection());
    const previous = this._conn;
    this._conn = conn;
    awaitSync(conn.beginTransaction());
    try {
      fn();
      awaitSync(conn.commit());
    } catch (err) {
      awaitSync(conn.rollback());
      throw err;
    } finally {
      this._conn = previous;
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
