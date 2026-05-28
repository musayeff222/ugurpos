import { chromium } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CAPTURE_DIR = path.join(ROOT, "captured");
const LOGIN_URL = "https://www.benimpos.com/login";
const MAX_PAGES = 40;

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

function safeName(url) {
  try {
    const u = new URL(url);
    const slug = (u.pathname + u.search).replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
    return slug || "home";
  } catch {
    return "page";
  }
}

async function capturePage(page, url, index) {
  const name = `${String(index).padStart(2, "0")}_${safeName(url)}`;
  const pageDir = path.join(CAPTURE_DIR, name);
  await ensureDir(pageDir);

  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(() =>
    page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 })
  );

  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(pageDir, "screenshot.png"), fullPage: true });
  const html = await page.content();
  await writeFile(path.join(pageDir, "page.html"), html, "utf8");

  const meta = {
    url: page.url(),
    title: await page.title(),
    capturedAt: new Date().toISOString(),
  };
  await writeFile(path.join(pageDir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");

  console.log(`  ✓ ${meta.title} → captured/${name}/`);
  return meta;
}

async function collectLinks(page, origin) {
  return page.evaluate((originHost) => {
    const links = new Set();
    document.querySelectorAll("a[href]").forEach((a) => {
      try {
        const href = a.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
        const full = new URL(href, window.location.href);
        if (full.origin === originHost && !full.pathname.includes("signout") && !full.pathname.includes("logout")) {
          links.add(full.pathname + full.search);
        }
      } catch {
        /* ignore bad urls */
      }
    });
    return [...links];
  }, origin);
}

async function main() {
  await ensureDir(CAPTURE_DIR);

  console.log("\n=== BenimPOS Panel Capture ===\n");
  console.log("1. Brauzer açılacaq.");
  console.log("2. Siz login səhifəsində əl ilə giriş edin (reCAPTCHA daxil).");
  console.log("3. Panel açılandan sonra bu terminala qayıdın və ENTER basın.\n");

  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "tr-TR",
  });
  const page = await context.newPage();

  await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded" });

  await new Promise((resolve) => {
    process.stdin.once("data", resolve);
  });

  const currentUrl = page.url();
  if (currentUrl.includes("/login")) {
    console.log("\n⚠ Hələ login səhifəsindəsiniz. Panel açılandan sonra yenidən ENTER basın.\n");
    await new Promise((resolve) => {
      process.stdin.once("data", resolve);
    });
  }

  const origin = new URL(page.url()).origin;
  console.log(`\nPanel URL: ${page.url()}\n`);
  console.log("Səhifələr toplanır...\n");

  const manifest = {
    capturedAt: new Date().toISOString(),
    origin,
    startUrl: page.url(),
    pages: [],
  };

  manifest.pages.push(await capturePage(page, page.url(), 1));

  const links = await collectLinks(page, origin);
  const visited = new Set([page.url()]);
  let index = 2;

  for (const linkPath of links.slice(0, MAX_PAGES - 1)) {
    const fullUrl = origin + linkPath;
    if (visited.has(fullUrl)) continue;
    visited.add(fullUrl);

    try {
      manifest.pages.push(await capturePage(page, fullUrl, index));
      index++;
    } catch (err) {
      console.log(`  ✗ Skip: ${fullUrl} (${err.message})`);
    }
  }

  const nav = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll("nav a, .sidebar a, .leftbar a, [class*='menu'] a, [class*='nav'] a").forEach((a) => {
      items.push({ text: a.textContent?.trim().slice(0, 80), href: a.getAttribute("href") });
    });
    return items.filter((i) => i.text && i.href);
  });

  manifest.navigation = nav;
  await writeFile(path.join(CAPTURE_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  console.log(`\n✅ Hazır! ${manifest.pages.length} səhifə → captured/`);
  console.log("   manifest.json — menyu və səhifə siyahısı\n");

  await browser.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
