import fs from "fs";
const h = fs.readFileSync(".oses-urunler.html", "utf8");
const m = h.match(/id="mainContent"[\s\S]*?<footer/i);
console.log(m ? m[0].replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\s+/g, " ").slice(0, 5000) : "none");
