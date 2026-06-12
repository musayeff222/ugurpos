import fs from "fs";
import path from "path";
import { resolveUploadsRoot } from "./uploadsDir.js";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export const MIME_TO_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const EXT_TO_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function matchesMagic(buffer, mime) {
  if (!buffer || buffer.length < 12) return false;
  if (mime === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mime === "image/webp") {
    return (
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
}

export function assertAllowedImageMime(mime) {
  if (!ALLOWED_IMAGE_MIME.has(mime)) {
    throw new Error("Desteklenen formatlar: JPG, JPEG, PNG, WEBP");
  }
}

export function validateImageBuffer(buffer, mime) {
  if (!buffer?.length) throw new Error("Gecersiz resim dosyasi");
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error("Resim 2MB'dan kucuk olmali");
  assertAllowedImageMime(mime);
  if (!matchesMagic(buffer, mime)) {
    throw new Error("Dosya icerigi secilen formata uymuyor");
  }
}

export function extensionForMime(mime) {
  assertAllowedImageMime(mime);
  return MIME_TO_EXT[mime] || ".jpg";
}

export function contentTypeForImagePath(imagePath) {
  const ext = path.extname(imagePath || "").toLowerCase();
  return EXT_TO_MIME[ext] || "image/jpeg";
}

/** Kalici uploads kokune gore mutlak yol (path traversal engelli). */
export function resolveAbsoluteUploadPath(...segments) {
  const root = path.resolve(resolveUploadsRoot());
  const absolute = path.resolve(path.join(root, ...segments));
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
    throw new Error("Gecersiz dosya yolu");
  }
  return absolute;
}

export function ensureUploadSubdir(...segments) {
  const dir = resolveAbsoluteUploadPath(...segments);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeImageFile(absoluteFilePath, buffer) {
  try {
    const dir = path.dirname(absoluteFilePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(absoluteFilePath, buffer);
    if (!fs.existsSync(absoluteFilePath)) {
      throw new Error("Dosya yazildi ama dogrulanamadi");
    }
  } catch (err) {
    throw new Error(`Resim kaydedilemedi (${absoluteFilePath}): ${err.message}`);
  }
}

export function removeFilesWithPrefix(dir, prefix) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (file.startsWith(prefix)) {
      fs.unlinkSync(path.join(dir, file));
    }
  }
}

export function saveBase64Image({ segments, filename, base64Data, mime }) {
  const buffer = Buffer.from(base64Data, "base64");
  validateImageBuffer(buffer, mime);
  const absolutePath = resolveAbsoluteUploadPath(...segments, filename);
  writeImageFile(absolutePath, buffer);
  return filename;
}

export function resolveStoredImageFile(segments, filename, legacyDir = null) {
  if (!filename) return null;

  const parts = Array.isArray(segments) ? segments : [segments];
  const primary = resolveAbsoluteUploadPath(...parts, filename);
  if (fs.existsSync(primary)) return primary;

  if (legacyDir) {
    const legacy = path.resolve(path.join(legacyDir, filename));
    if (fs.existsSync(legacy)) return legacy;
  }

  return null;
}
