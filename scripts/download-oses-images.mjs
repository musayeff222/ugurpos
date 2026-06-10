import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const htmlPath = path.join(root, "tmp-oses.html");
const outDir = path.join(root, "public", "images", "oses");

const BASE = "https://www.oses.com.tr/";

/** OSES ana sayfadaki görseller (oses.com.tr) */
const OSES_ASSETS = [
  // Hero slider
  "photos/promo/promo-1.jpg",
  "photos/promo/promo-2.jpg",
  "photos/promo/promo-3.jpg",
  // Kampanya / öne çıkanlar
  "photos/onecikanlar/tatli-severler.jpg",
  "photos/onecikanlar/mutluluga-doyma-zamani.jpg",
  // Sipariş şeridi
  "assets/images/oses-yemeksepeti.jpg",
  "assets/images/oses-getir.jpg",
  "assets/images/hemen_siparis_ver.png",
  "assets/images/en_yakin_oses.png",
  "assets/images/kampanyalar.png",
  // Özellik kutuları
  "assets/images/ico_bayilik.png",
  "assets/images/ico_kalite.png",
  "assets/images/ico_gida-guvenligi.png",
  "assets/images/ico_tuketici.png",
  // Alt bölüm
  "assets/images/oses-lezzetleri.jpg",
  "assets/images/oses-25yil.png",
  "assets/images/oses.png",
];

function localName(remotePath) {
  return remotePath.replace(/\//g, "__");
}

async function downloadOne(remotePath) {
  const url = new URL(remotePath, BASE).href;
  const dest = path.join(outDir, localName(remotePath));
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; CigkofteSiteSetup/1.0)" },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return { remotePath, dest, bytes: buf.length };
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`Downloading ${OSES_ASSETS.length} OSES assets to ${outDir}`);
  const results = [];
  for (const asset of OSES_ASSETS) {
    try {
      const r = await downloadOne(asset);
      results.push(r);
      console.log(`OK  ${asset} (${r.bytes} bytes)`);
    } catch (e) {
      console.error(`FAIL ${asset}: ${e.message}`);
    }
  }
  fs.writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify(
      results.map(({ remotePath }) => ({
        remotePath,
        localPath: `/images/oses/${localName(remotePath)}`,
      })),
      null,
      2
    )
  );
  console.log(`Done: ${results.length}/${OSES_ASSETS.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
