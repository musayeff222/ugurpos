import fs from "fs";
import path from "path";
import { legacyUploadsRoot, resolveLegacyDataDir, resolveUploadsRoot } from "./uploadsDir.js";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const MIME_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function getMenuLogoDir(firmId) {
  const dir = path.join(resolveUploadsRoot(), "menu-logos", firmId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function clearLogoDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    fs.unlinkSync(path.join(dir, file));
  }
}

export function saveMenuLogo(firmId, base64Data, mime) {
  if (!base64Data || !mime) throw new Error("Logo verisi gerekli");
  if (!ALLOWED_MIME.has(mime)) throw new Error("Desteklenen formatlar: JPG, PNG, WEBP, GIF");

  const buffer = Buffer.from(base64Data, "base64");
  if (!buffer.length) throw new Error("Geçersiz logo dosyası");
  if (buffer.length > MAX_BYTES) throw new Error("Logo 2MB'dan küçük olmalı");

  const ext = MIME_EXT[mime] || ".jpg";
  const filename = `logo-${Date.now()}${ext}`;
  const dir = getMenuLogoDir(firmId);
  clearLogoDir(dir);
  fs.writeFileSync(path.join(dir, filename), buffer);
  return filename;
}

export function deleteMenuLogo(firmId) {
  clearLogoDir(getMenuLogoDir(firmId));
}

export function resolveMenuLogoFile(firmId, logoPath) {
  if (!logoPath) return null;

  const primary = path.join(getMenuLogoDir(firmId), logoPath);
  if (fs.existsSync(primary)) return primary;

  const legacy = path.join(legacyUploadsRoot(resolveLegacyDataDir()), "menu-logos", firmId, logoPath);
  if (fs.existsSync(legacy)) return legacy;

  return null;
}

/** Tarayici onbellegini kirmak icin dosya degisim zamanini ekler. */
export function menuLogoPublicUrlWithVersion(firmId, logoPath) {
  if (!firmId || !logoPath) return null;
  const base = `/uploads/menu-logos/${encodeURIComponent(firmId)}/${encodeURIComponent(logoPath)}`;
  const filePath = resolveMenuLogoFile(firmId, logoPath);
  if (!filePath) return base;
  try {
    return `${base}?v=${fs.statSync(filePath).mtimeMs}`;
  } catch {
    return base;
  }
}

export { contentTypeForImagePath } from "./productImage.js";
