import fs from "fs";

const html = fs.readFileSync(".oses-home.html", "utf8");
const main = html.match(/<div id="mainContent"[\s\S]*?<footer/i);
if (!main) {
  console.log("no mainContent");
  process.exit(1);
}
let chunk = main[0].slice(0, 15000);
chunk = chunk
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/\s+/g, " ")
  .replace(/></g, ">\n<");
console.log(chunk);
