/**
 * Hostinger / MySQL: veritabani olusturma
 * Kullanim: node scripts/setup-mysql.mjs
 */
import mysql from "mysql2/promise";

const config = {
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
};

const database = process.env.MYSQL_DATABASE || "ugurpos";

async function main() {
  const conn = await mysql.createConnection(config);
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log(`MySQL database hazir: ${database}`);
  await conn.end();
}

main().catch((err) => {
  console.error("MySQL setup hatasi:", err.message);
  process.exit(1);
});
