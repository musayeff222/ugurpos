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

export function getProductUploadDir(branchId) {
  const dir = path.join(resolveUploadsRoot(), "products", branchId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function removeExistingProductImages(dir, productId) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (file.startsWith(`${productId}.`)) {
      fs.unlinkSync(path.join(dir, file));
    }
  }
}

export function saveProductImage(branchId, productId, base64Data, mime) {
  if (!base64Data || !mime) {
    throw new Error("Resim verisi gerekli");
  }
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error("Desteklenen formatlar: JPG, PNG, WEBP, GIF");
  }

  const buffer = Buffer.from(base64Data, "base64");
  if (!buffer.length) {
    throw new Error("Geçersiz resim dosyası");
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error("Resim 2MB'dan küçük olmalı");
  }

  const ext = MIME_EXT[mime] || ".jpg";
  const filename = `${productId}${ext}`;
  const dir = getProductUploadDir(branchId);
  removeExistingProductImages(dir, productId);
  fs.writeFileSync(path.join(dir, filename), buffer);
  return filename;
}

export function deleteProductImage(branchId, productId) {
  const dir = getProductUploadDir(branchId);
  removeExistingProductImages(dir, productId);
}

export function resolveProductImageFile(branchId, imagePath) {
  if (!imagePath) return null;

  const primary = path.join(getProductUploadDir(branchId), imagePath);
  if (fs.existsSync(primary)) return primary;

  const legacy = path.join(legacyUploadsRoot(resolveLegacyDataDir()), "products", branchId, imagePath);
  if (fs.existsSync(legacy)) return legacy;

  return null;
}

export function contentTypeForImagePath(imagePath) {
  const ext = path.extname(imagePath || "").toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}
