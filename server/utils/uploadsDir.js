import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..", "..");

let uploadsRoot;

function findPublicHtmlDir() {
  const candidates = [
    process.env.PUBLIC_HTML,
    path.join(PROJECT_ROOT, "public_html"),
    path.join(PROJECT_ROOT, "..", "public_html"),
    path.join(PROJECT_ROOT, "..", "..", "public_html"),
  ].filter(Boolean);

  for (const dir of candidates) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      return path.resolve(dir);
    }
  }
  return null;
}

export function resolveUploadsRoot() {
  if (uploadsRoot) return uploadsRoot;

  if (process.env.UPLOADS_DIR) {
    uploadsRoot = path.resolve(process.env.UPLOADS_DIR);
  } else {
    const publicHtml = findPublicHtmlDir();
    uploadsRoot = publicHtml
      ? path.join(publicHtml, "uploads")
      : path.join(PROJECT_ROOT, "public_html", "uploads");
  }

  fs.mkdirSync(uploadsRoot, { recursive: true });
  return uploadsRoot;
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
