import { getDb, getDataDir, uid } from "../server/db/index.js";
import { seedCigkofteForAllBranches } from "../server/seed/cigkofte/seedProducts.js";

const db = getDb();
const dataDir = getDataDir();
const results = seedCigkofteForAllBranches(db, dataDir, { uid });

console.log("[seed:cigkofte] Tamamlandi.\n");
for (const row of results) {
  console.log(
    `- ${row.branchName}: ${row.added} yeni, ${row.updated} guncellendi (${row.total} urun)`
  );
}
