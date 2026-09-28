const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "dist");
const dest = path.join(__dirname, "app");

if (!fs.existsSync(path.join(src, "index.html"))) {
  console.error("Kassir proqramı yoxdur. Əvvəl layihə qovluğunda npm run build işlədin.");
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log("Kassir faylları desktop/app içərisinə köçürüldü.");
