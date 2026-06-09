import { getDb, getDataDir, uid } from "../server/db/index.js";
import { seedCigkofteForAllBranches, repairCigkofteProductImages } from "../server/seed/cigkofte/seedProducts.js";

const db = getDb();
const dataDir = getDataDir();
const results = seedCigkofteForAllBranches(db, dataDir, { uid });
const repaired = repairCigkofteProductImages(db);

console.log("[seed:cigkofte] Tamamlandi.\n");
for (const row of results) {
  console.log(
    `- ${row.branchName}: ${row.added} yeni, ${row.updated} guncellendi (${row.total} urun)`
  );
}
console.log(`- Urun resimleri: ${repaired} kayit`);
