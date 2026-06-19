import fs from "fs";

const html = fs.readFileSync(".oses-home.html", "utf8");
const header = html.match(/<div class="account"[\s\S]*?<\/header>/i)?.[0];
const footer = html.match(/<footer[\s\S]*?<\/footer>/i)?.[0];
console.log("=== HEADER ===\n", header?.replace(/\s+/g, " ").slice(0, 3000));
console.log("\n=== FOOTER ===\n", footer?.replace(/\s+/g, " ").slice(0, 3000));
