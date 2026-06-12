import fs from "fs";
import path from "path";
import {
  extensionForMime,
  ensureUploadSubdir,
  resolveAbsoluteUploadPath,
  saveBase64Image,
} from "./imageStorage.js";

export function getMenuWebImageDir(firmId) {
  return ensureUploadSubdir("menu-web", firmId);
}

export function saveMenuWebImage(firmId, slot, base64Data, mime) {
  if (!base64Data || !mime) throw new Error("Gorsel verisi gerekli");

  const safeSlot = String(slot).replace(/[^\w-]/g, "") || "image";
  const ext = extensionForMime(mime);
  const filename = `${safeSlot}${ext}`;
  saveBase64Image({
    segments: ["menu-web", firmId],
    filename,
    base64Data,
    mime,
  });
  return menuWebImagePublicUrl(firmId, filename);
}

export function menuWebImagePublicUrl(firmId, filename) {
  const base = `/uploads/menu-web/${encodeURIComponent(firmId)}/${encodeURIComponent(filename)}`;
  try {
    const filePath = resolveAbsoluteUploadPath("menu-web", firmId, filename);
    if (fs.existsSync(filePath)) return `${base}?v=${fs.statSync(filePath).mtimeMs}`;
  } catch {
    /* ignore */
  }
  return base;
}
