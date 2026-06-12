import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.join(__dirname, "..", "..");

let uploadsRoot;

function isInsideProject(dir) {
  const resolved = path.resolve(dir);
  const root = path.resolve(PROJECT_ROOT);
  return resolved === root || resolved.startsWith(`${root}${path.sep}`);
}

function dirExists(dir) {
  try {
    return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

/** Hostinger: domains/site.az/nodejs + public_html yaninda kalici uploads/ */
export function resolveHostingerDomainUploads() {
  const domainRoot = path.dirname(PROJECT_ROOT);
  const appFolder = path.basename(PROJECT_ROOT).toLowerCase();

  if (appFolder === "nodejs" || appFolder === "node") {
    return path.join(domainRoot, "uploads");
  }

  if (dirExists(path.join(domainRoot, "public_html")) && dirExists(path.join(domainRoot, "nodejs"))) {
    return path.join(domainRoot, "uploads");
  }

  return null;
}

function collectPublicHtmlCandidates() {
  const candidates = [];

  if (process.env.PUBLIC_HTML) {
    candidates.push(path.resolve(process.env.PUBLIC_HTML));
  }

  const home = process.env.HOME || process.env.USERPROFILE;
  if (home) {
    const domainsDir = path.join(home, "domains");
    if (dirExists(domainsDir)) {
      for (const entry of fs.readdirSync(domainsDir)) {
        candidates.push(path.join(domainsDir, entry, "public_html"));
      }
    }
  }

  let dir = path.dirname(PROJECT_ROOT);
  for (let i = 0; i < 6; i += 1) {
    candidates.push(path.join(dir, "public_html"));
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  candidates.push(path.join(PROJECT_ROOT, "public_html"));

  const seen = new Set();
  return candidates.filter((dir) => {
    const key = path.resolve(dir);
    if (seen.has(key)) return false;
    seen.add(key);
    return dirExists(dir);
  });
}

function findPublicHtmlDir() {
  const candidates = collectPublicHtmlCandidates();
  const external = candidates.find((dir) => !isInsideProject(dir));
  if (external) return path.resolve(external);

  if (candidates.length > 0) return path.resolve(candidates[candidates.length - 1]);
  return null;
}

function ensureUploadsStructure(root) {
  fs.mkdirSync(path.join(root, "products"), { recursive: true });
  fs.mkdirSync(path.join(root, "menu-logos"), { recursive: true });

  const readme = path.join(root, "README.txt");
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(
      readme,
      "Urun ve menu resimleri bu klasorde saklanir.\nnodejs/ deploy ile silinmez.\n",
      "utf8"
    );
  }
}

export function resolveUploadsRoot() {
  if (uploadsRoot) return uploadsRoot;

  if (process.env.UPLOADS_DIR) {
    uploadsRoot = path.resolve(process.env.UPLOADS_DIR);
  } else {
    const hostingerUploads = resolveHostingerDomainUploads();
    if (hostingerUploads) {
      uploadsRoot = path.resolve(hostingerUploads);
    } else {
      const publicHtml = findPublicHtmlDir();
      uploadsRoot = publicHtml
        ? path.join(publicHtml, "uploads")
        : path.join(PROJECT_ROOT, "public_html", "uploads");
    }
  }

  fs.mkdirSync(uploadsRoot, { recursive: true });
  ensureUploadsStructure(uploadsRoot);

  if (isInsideProject(uploadsRoot) && process.env.NODE_ENV === "production") {
    console.warn(
      "[uploads] UYARI: Resimler nodejs klasorunun icinde — deploy sonrasi silinebilir."
    );
  } else if (!process.env.UPLOADS_DIR) {
    console.log(`[uploads] Kalici klasor: ${uploadsRoot}`);
  }

  return uploadsRoot;
}

export function inProjectUploadsDir() {
  return path.join(PROJECT_ROOT, "public_html", "uploads");
}

export function domainSiblingUploadsDir() {
  return path.join(path.dirname(PROJECT_ROOT), "uploads");
}

export function isPersistentUploadsRoot(root = resolveUploadsRoot()) {
  return !isInsideProject(root);
}

export function productImagePublicUrl(branchId, filename) {
  if (!branchId || !filename) return null;
  return `/uploads/products/${encodeURIComponent(branchId)}/${encodeURIComponent(filename)}`;
}

export function menuLogoPublicUrl(firmId, filename) {
  if (!firmId || !filename) return null;
  return `/uploads/menu-logos/${encodeURIComponent(firmId)}/${encodeURIComponent(filename)}`;
}

export function legacyUploadsRoot(dataDir) {
  return path.join(dataDir, "uploads");
}

export function resolveLegacyDataDir() {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  if (process.env.VERCEL) return path.join("/tmp", "ugurpos");
  return path.join(__dirname, "..", "data");
}
