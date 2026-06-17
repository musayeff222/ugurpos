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

/** Hostinger: domain kokunde uploads (public_html disinda) */
export function resolveHostingerDomainUploads() {
  const domainRoot = path.dirname(PROJECT_ROOT);
  const appFolder = path.basename(PROJECT_ROOT).toLowerCase();
  const publicHtml = path.join(domainRoot, "public_html");
  const isHostingerLayout =
    appFolder === "nodejs" ||
    appFolder === "node" ||
    (dirExists(publicHtml) && dirExists(path.join(domainRoot, "nodejs")));

  if (!isHostingerLayout) return null;
  return path.join(domainRoot, "uploads");
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
  for (const sub of ["products", "menu-logos", "menu-web", "seed"]) {
    fs.mkdirSync(path.join(root, sub), { recursive: true });
  }

  const readme = path.join(root, "README.txt");
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(
      readme,
      "Urun ve menu resimleri bu klasorde saklanir.\nDomain kokundeki uploads klasoru deploy ile silinmez.\n",
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
    } else if (process.env.PUBLIC_HTML) {
      uploadsRoot = path.resolve(process.env.PUBLIC_HTML, "uploads");
    } else {
      const publicHtml = findPublicHtmlDir();
      const externalHtml = publicHtml && !isInsideProject(publicHtml) ? publicHtml : null;
      if (externalHtml) {
        uploadsRoot = path.resolve(externalHtml, "uploads");
      } else if (process.env.NODE_ENV === "production") {
        uploadsRoot = path.resolve(path.join(path.dirname(PROJECT_ROOT), "public_html", "uploads"));
      } else {
        uploadsRoot = path.resolve(path.join(PROJECT_ROOT, "public_html", "uploads"));
      }
    }
  }

  const hostingerUploads = resolveHostingerDomainUploads();
  if (process.env.NODE_ENV === "production" && hostingerUploads) {
    const forced = path.resolve(hostingerUploads);
    if (uploadsRoot !== forced) {
      console.log(`[uploads] Hostinger production yolu zorlandi: ${forced}`);
    }
    uploadsRoot = forced;
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

function countFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) count += countFilesRecursive(full);
    else count += 1;
  }
  return count;
}

export function getUploadsStats() {
  const root = resolveUploadsRoot();
  const productsDir = path.join(root, "products");
  const branches = [];

  if (fs.existsSync(productsDir)) {
    for (const entry of fs.readdirSync(productsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const branchDir = path.join(productsDir, entry.name);
      branches.push({
        branchId: entry.name,
        files: countFilesRecursive(branchDir),
      });
    }
  }

  return {
    root,
    persistent: isPersistentUploadsRoot(root),
    exists: fs.existsSync(root),
    readme: fs.existsSync(path.join(root, "README.txt")),
    productFiles: countFilesRecursive(productsDir),
    seedFiles: countFilesRecursive(path.join(root, "seed")),
    menuWebFiles: countFilesRecursive(path.join(root, "menu-web")),
    menuLogoFiles: countFilesRecursive(path.join(root, "menu-logos")),
    branches,
  };
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
