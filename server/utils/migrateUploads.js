import fs from "fs";
import path from "path";
import { legacyUploadsRoot, resolveUploadsRoot } from "./uploadsDir.js";

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return 0;
  fs.mkdirSync(dest, { recursive: true });
  let copied = 0;

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copied += copyDir(srcPath, destPath);
    } else if (!fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath);
      copied += 1;
    }
  }

  return copied;
}

export function migrateUploadsFromDataDir(dataDir) {
  const legacyRoot = legacyUploadsRoot(dataDir);
  const newRoot = resolveUploadsRoot();

  if (path.resolve(legacyRoot) === path.resolve(newRoot)) return 0;
  if (!fs.existsSync(legacyRoot)) return 0;

  const copied = copyDir(legacyRoot, newRoot);
  if (copied > 0) {
    console.log(`[uploads] ${copied} dosya public_html/uploads icine tasindi`);
  }
  return copied;
}
