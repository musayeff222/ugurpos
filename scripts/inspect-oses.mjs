import fs from "fs";

const html = fs.readFileSync(".oses-home.html", "utf8");
const cssLinks = [...html.matchAll(/href="([^"]+\.css[^"]*)"/gi)].map((m) => m[1]);
console.log("CSS links:\n", [...new Set(cssLinks)].join("\n"));

const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
if (bodyMatch) {
  const body = bodyMatch[1]
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  const tags = [...body.matchAll(/<(header|nav|section|footer|main|div)[^>]*class="([^"]*)"/gi)]
    .slice(0, 60)
    .map((m) => `${m[1]}.${m[2]}`);
  console.log("\nStructure:\n", tags.join("\n"));
}
