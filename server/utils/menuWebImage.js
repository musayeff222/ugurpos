import fs from "fs";
import path from "path";
import { resolveUploadsRoot } from "./uploadsDir.js";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const MIME_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function getMenuWebImageDir(firmId) {
  const dir = path.join(resolveUploadsRoot(), "menu-web", firmId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function saveMenuWebImage(firmId, slot, base64Data, mime) {
  if (!base64Data || !mime) throw new Error("Görsel verisi gerekli");
  if (!ALLOWED_MIME.has(mime)) throw new Error("Desteklenen formatlar: JPG, PNG, WEBP, GIF");

  const buffer = Buffer.from(base64Data, "base64");
  if (!buffer.length) throw new Error("Geçersiz görsel dosyası");
  if (buffer.length > MAX_BYTES) throw new Error("Görsel 2MB'dan küçük olmalı");

  const safeSlot = String(slot).replace(/[^\w-]/g, "") || "image";
  const ext = MIME_EXT[mime] || ".jpg";
  const filename = `${safeSlot}${ext}`;
  const filePath = path.join(getMenuWebImageDir(firmId), filename);
  fs.writeFileSync(filePath, buffer);
  return menuWebImagePublicUrl(firmId, filename);
}

export function menuWebImagePublicUrl(firmId, filename) {
  const base = `/uploads/menu-web/${encodeURIComponent(firmId)}/${encodeURIComponent(filename)}`;
  try {
    const filePath = path.join(getMenuWebImageDir(firmId), filename);
    if (fs.existsSync(filePath)) return `${base}?v=${fs.statSync(filePath).mtimeMs}`;
  } catch {
    /* ignore */
  }
  return base;
}
