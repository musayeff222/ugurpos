import fs from "fs";
import path from "path";
import {
  domainSiblingUploadsDir,
  inProjectUploadsDir,
  legacyUploadsRoot,
  PROJECT_ROOT,
  resolveUploadsRoot,
} from "./uploadsDir.js";

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

function collectMigrationSources(dataDir) {
  const sources = [
    legacyUploadsRoot(dataDir),
    inProjectUploadsDir(),
    path.join(PROJECT_ROOT, "..", "public_html", "uploads"),
    domainSiblingUploadsDir(),
  ];

  const seen = new Set();
  return sources.filter((dir) => {
    const key = path.resolve(dir);
    if (seen.has(key)) return false;
    seen.add(key);
    return fs.existsSync(dir);
  });
}

export function migrateUploadsFromDataDir(dataDir) {
  const target = resolveUploadsRoot();
  const targetKey = path.resolve(target);
  let copied = 0;

  for (const src of collectMigrationSources(dataDir)) {
    if (path.resolve(src) === targetKey) continue;
    copied += copyDir(src, target);
  }

  if (copied > 0) {
    console.log(`[uploads] ${copied} dosya kalici dizine tasindi: ${target}`);
  }

  return copied;
}
