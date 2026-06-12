import fs from "fs";
import path from "path";
import multer from "multer";
import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  extensionForMime,
  removeFilesWithPrefix,
  resolveAbsoluteUploadPath,
} from "../utils/imageStorage.js";
import { resolveUploadsRoot } from "../utils/uploadsDir.js";

function imageFileFilter(_req, file, cb) {
  if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
    cb(new Error("Desteklenen formatlar: JPG, JPEG, PNG, WEBP"));
    return;
  }
  cb(null, true);
}

/**
 * Multer disk storage — dosyalar kalici uploads/ altina (mutlak yol) yazilir.
 * @param {(...segments: string[]) => string[]} pathSegmentsFn req => [subdir, ...]
 * @param {(req, file) => string} filenameFn
 */
export function createImageUploadMiddleware(pathSegmentsFn, filenameFn) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const segments = pathSegmentsFn(req);
        const dir = resolveAbsoluteUploadPath(...segments);
        fs.mkdirSync(dir, { recursive: true });
        if (req.params?.id) removeFilesWithPrefix(dir, `${req.params.id}.`);
        cb(null, dir);
      } catch (err) {
        cb(err);
      }
    },
    filename: (req, file, cb) => {
      try {
        const name = filenameFn(req, file);
        const ext = extensionForMime(file.mimetype);
        cb(null, name.endsWith(ext) ? name : `${name}${ext}`);
      } catch (err) {
        cb(err);
      }
    },
  });

  return multer({
    storage,
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    fileFilter: imageFileFilter,
  });
}

/** Urun resmi: POST/PATCH multipart (image alani) */
export const productImageUpload = createImageUploadMiddleware(
  (req) => ["products", req.branchId],
  (req) => `${req.params.id || `new-${Date.now()}`}`
);

export function getUploadsRootAbsolute() {
  return path.resolve(resolveUploadsRoot());
}
