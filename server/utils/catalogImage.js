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
import { saveProductImageFromFile, deleteProductImage } from "./productImage.js";

export { contentTypeForImagePath };

export function getCatalogUploadDir(firmId) {
  return ensureUploadSubdir("catalog", firmId);
}

export function saveCatalogImage(firmId, productId, base64Data, mime) {
  if (!base64Data || !mime) throw new Error("Resim verisi gerekli");
  const ext = extensionForMime(mime);
  const filename = `${productId}${ext}`;
  const dir = getCatalogUploadDir(firmId);
  removeFilesWithPrefix(dir, `${productId}.`);
  return saveBase64Image({
    segments: ["catalog", firmId],
    filename,
    base64Data,
    mime,
  });
}

export function saveCatalogImageFromFile(firmId, productId, filePath, mime) {
  const buffer = fs.readFileSync(filePath);
  validateImageBuffer(buffer, mime);
  const ext = extensionForMime(mime);
  const filename = `${productId}${ext}`;
  const dir = getCatalogUploadDir(firmId);
  removeFilesWithPrefix(dir, `${productId}.`);
  const dest = resolveAbsoluteUploadPath("catalog", firmId, filename);
  fs.copyFileSync(filePath, dest);
  return filename;
}

export function deleteCatalogImage(firmId, productId) {
  const dir = getCatalogUploadDir(firmId);
  removeFilesWithPrefix(dir, `${productId}.`);
}

export function resolveCatalogImageFile(firmId, imagePath) {
  const legacyDir = path.join(legacyUploadsRoot(resolveLegacyDataDir()), "catalog", firmId);
  return resolveStoredImageFile(["catalog", firmId], imagePath, legacyDir);
}

export function copyCatalogImageToBranch(firmId, firmImagePath, branchId, branchProductId) {
  if (!firmImagePath) {
    deleteProductImage(branchId, branchProductId);
    return null;
  }
  const src = resolveCatalogImageFile(firmId, firmImagePath);
  if (!src) return null;
  const mime =
    firmImagePath.endsWith(".png")
      ? "image/png"
      : firmImagePath.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";
  return saveProductImageFromFile(branchId, branchProductId, src, mime);
}
