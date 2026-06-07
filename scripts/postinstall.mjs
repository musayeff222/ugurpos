import { execSync } from "child_process";

if (process.env.VERCEL || process.env.SKIP_NATIVE_REBUILD === "1") {
  process.exit(0);
}

try {
  execSync("npm rebuild better-sqlite3", { stdio: "inherit" });
} catch (err) {
  console.warn("[postinstall] better-sqlite3 rebuild failed:", err.message);
}
