import fs from "fs";
import path from "path";
import { legacyUploadsRoot, resolveLegacyDataDir } from "./uploadsDir.js";
import {
  contentTypeForImagePath,
  extensionForMime,
  removeFilesWithPrefix,
  resolveAbsoluteUploadPath,
  resolveStoredImageFile,
  saveBase64Image,
  validateImageBuffer,
  ensureUploadSubdir,
} from "./imageStorage.js";

export { contentTypeForImagePath };

export function getProductUploadDir(branchId) {
  return ensureUploadSubdir("products", branchId);
}

export function saveProductImage(branchId, productId, base64Data, mime) {
  if (!base64Data || !mime) throw new Error("Resim verisi gerekli");

  const ext = extensionForMime(mime);
  const filename = `${productId}${ext}`;
  const dir = getProductUploadDir(branchId);
  removeFilesWithPrefix(dir, `${productId}.`);
  return saveBase64Image({
    segments: ["products", branchId],
    filename,
    base64Data,
    mime,
  });
}

export function saveProductImageFromFile(branchId, productId, filePath, mime) {
  const buffer = fs.readFileSync(filePath);
  validateImageBuffer(buffer, mime);
  const ext = extensionForMime(mime);
  const filename = `${productId}${ext}`;
  const dir = getProductUploadDir(branchId);
  removeFilesWithPrefix(dir, `${productId}.`);
  const dest = resolveAbsoluteUploadPath("products", branchId, filename);
  fs.copyFileSync(filePath, dest);
  return filename;
}

export function deleteProductImage(branchId, productId) {
  const dir = getProductUploadDir(branchId);
  removeFilesWithPrefix(dir, `${productId}.`);
}

export function resolveProductImageFile(branchId, imagePath) {
  const legacyDir = path.join(legacyUploadsRoot(resolveLegacyDataDir()), "products", branchId);
  return resolveStoredImageFile(["products", branchId], imagePath, legacyDir);
}
