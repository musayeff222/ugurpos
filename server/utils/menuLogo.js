import fs from "fs";
import path from "path";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const MIME_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function getMenuLogoDir(dataDir, firmId) {
  const dir = path.join(dataDir, "uploads", "menu-logos", firmId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function removeExistingLogos(dir) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (file.startsWith("logo.")) fs.unlinkSync(path.join(dir, file));
  }
}

export function saveMenuLogo(dataDir, firmId, base64Data, mime) {
  if (!base64Data || !mime) throw new Error("Logo verisi gerekli");
  if (!ALLOWED_MIME.has(mime)) throw new Error("Desteklenen formatlar: JPG, PNG, WEBP, GIF");

  const buffer = Buffer.from(base64Data, "base64");
  if (!buffer.length) throw new Error("Geçersiz logo dosyası");
  if (buffer.length > MAX_BYTES) throw new Error("Logo 2MB'dan küçük olmalı");

  const ext = MIME_EXT[mime] || ".jpg";
  const filename = `logo${ext}`;
  const dir = getMenuLogoDir(dataDir, firmId);
  removeExistingLogos(dir);
  fs.writeFileSync(path.join(dir, filename), buffer);
  return filename;
}

export function deleteMenuLogo(dataDir, firmId) {
  removeExistingLogos(getMenuLogoDir(dataDir, firmId));
}

export function resolveMenuLogoFile(dataDir, firmId, logoPath) {
  if (!logoPath) return null;
  const filePath = path.join(getMenuLogoDir(dataDir, firmId), logoPath);
  if (!fs.existsSync(filePath)) return null;
  return filePath;
}

export { contentTypeForImagePath } from "./productImage.js";
