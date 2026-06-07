import fs from "fs";
import path from "path";

const index = path.join(process.cwd(), "dist", "index.html");

if (!fs.existsSync(index)) {
  console.error("[build] dist/index.html yok — vite build basarisiz.");
  process.exit(1);
}

console.log("[build] dist/index.html hazir (Express app.js tarafindan servis edilir).");
