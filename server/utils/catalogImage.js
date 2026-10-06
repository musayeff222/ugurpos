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
import { saveProductImageFromFile, deleteProductImage, resolveProductImageFile } from "./productImage.js";

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
  const dest = resolveAbsoluteUploadPath("catalog", firmId, filename);
  const sameFile = path.resolve(filePath) === path.resolve(dest);
  if (!sameFile) {
    const dir = getCatalogUploadDir(firmId);
    removeFilesWithPrefix(dir, `${productId}.`);
    fs.writeFileSync(dest, buffer);
  }
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

function normName(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/\u0307/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Şöbə məhsulunda şəkil faylı yoxdursa, admin kataloqundakı şəkli həmin şöbəyə köçürür.
 * Bəzi şöbələr kataloq şəkli yüklənəndən sonra bağlanmadığı üçün boş qalırdı.
 */
export function repairBranchCatalogImages(db, branchId) {
  if (!branchId) return 0;
  const branch = db.prepare("SELECT firm_id FROM branches WHERE id = ?").get(branchId);
  if (!branch?.firm_id) return 0;

  let catalog = [];
  try {
    catalog = db
      .prepare(
        "SELECT id, name, image_path FROM firm_products WHERE firm_id = ? AND image_path IS NOT NULL AND TRIM(image_path) != ''"
      )
      .all(branch.firm_id);
  } catch {
    return 0;
  }
  if (!catalog.length) return 0;

  const byId = new Map(catalog.map((row) => [row.id, row]));
  const byName = new Map(catalog.map((row) => [normName(row.name), row]));
  const products = db
    .prepare("SELECT id, name, firm_product_id, image_path FROM products WHERE branch_id = ?")
    .all(branchId);

  let repaired = 0;
  const update = db.prepare("UPDATE products SET image_path = ? WHERE id = ? AND branch_id = ?");
  for (const product of products) {
    const firm =
      (product.firm_product_id && byId.get(product.firm_product_id)) || byName.get(normName(product.name));
    if (!firm?.image_path) continue;
    if (product.image_path && resolveProductImageFile(branchId, product.image_path)) continue;
    try {
      const filename = copyCatalogImageToBranch(branch.firm_id, firm.image_path, branchId, product.id);
      if (!filename) continue;
      update.run(filename, product.id, branchId);
      repaired += 1;
    } catch {
      /* bir şəkil alınmasa digər məhsullar davam etsin */
    }
  }
  return repaired;
}

export function branchImageMatchesCatalog(firmId, firmImagePath, branchId, imagePath) {
  if (!firmImagePath || !imagePath) return false;
  const src = resolveCatalogImageFile(firmId, firmImagePath);
  const dest = resolveProductImageFile(branchId, imagePath);
  if (!src || !dest) return false;
  try {
    const srcSize = fs.statSync(src).size;
    return srcSize > 0 && srcSize === fs.statSync(dest).size;
  } catch {
    return false;
  }
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
