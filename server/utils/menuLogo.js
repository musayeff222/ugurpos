import fs from "fs";
import path from "path";
import { legacyUploadsRoot, resolveLegacyDataDir } from "./uploadsDir.js";
import {
  contentTypeForImagePath,
  extensionForMime,
  ensureUploadSubdir,
  resolveAbsoluteUploadPath,
  resolveStoredImageFile,
  saveBase64Image,
} from "./imageStorage.js";

export { contentTypeForImagePath };

export function getMenuLogoDir(firmId) {
  return ensureUploadSubdir("menu-logos", firmId);
}

function clearLogoDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    fs.unlinkSync(path.join(dir, file));
  }
}

export function saveMenuLogo(firmId, base64Data, mime) {
  if (!base64Data || !mime) throw new Error("Logo verisi gerekli");

  const ext = extensionForMime(mime);
  const filename = `logo-${Date.now()}${ext}`;
  const dir = getMenuLogoDir(firmId);
  clearLogoDir(dir);
  return saveBase64Image({
    segments: ["menu-logos", firmId],
    filename,
    base64Data,
    mime,
  });
}

export function deleteMenuLogo(firmId) {
  clearLogoDir(getMenuLogoDir(firmId));
}

export function resolveMenuLogoFile(firmId, logoPath) {
  const legacyDir = path.join(legacyUploadsRoot(resolveLegacyDataDir()), "menu-logos", firmId);
  return resolveStoredImageFile(["menu-logos", firmId], logoPath, legacyDir);
}

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
