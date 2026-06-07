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

export function getProductUploadDir(dataDir, branchId) {
  const dir = path.join(dataDir, "uploads", "products", branchId);
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

export function saveProductImage(dataDir, branchId, productId, base64Data, mime) {
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
  const dir = getProductUploadDir(dataDir, branchId);
  removeExistingProductImages(dir, productId);
  fs.writeFileSync(path.join(dir, filename), buffer);
  return filename;
}

export function deleteProductImage(dataDir, branchId, productId) {
  const dir = getProductUploadDir(dataDir, branchId);
  removeExistingProductImages(dir, productId);
}

export function resolveProductImageFile(dataDir, branchId, imagePath) {
  if (!imagePath) return null;
  const filePath = path.join(getProductUploadDir(dataDir, branchId), imagePath);
  if (!fs.existsSync(filePath)) return null;
  return filePath;
}

export function contentTypeForImagePath(imagePath) {
  const ext = path.extname(imagePath || "").toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}
