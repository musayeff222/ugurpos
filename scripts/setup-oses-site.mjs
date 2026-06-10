import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const out = path.join(root, "public", "oses");
const BASE = "https://www.oses.com.tr/";

const FILES = [
  "assets/css/style.css",
  "assets/images/oses.png",
  "assets/images/oses-25yil.png",
  "assets/images/oses-lezzetleri.jpg",
  "assets/images/oses-yemeksepeti.jpg",
  "assets/images/oses-getir.jpg",
  "assets/images/hemen_siparis_ver.png",
  "assets/images/en_yakin_oses.png",
  "assets/images/kampanyalar.png",
  "assets/images/ico_bayilik.png",
  "assets/images/ico_kalite.png",
  "assets/images/ico_gida-guvenligi.png",
  "assets/images/ico_tuketici.png",
  "assets/images/basvur.jpg",
  "assets/images/franchise-icon.png",
  "assets/images/icon-phone.png",
  "assets/images/icon-mail.png",
  "assets/images/google_play.svg",
  "assets/images/apple_store.svg",
  "photos/promo/promo-1.jpg",
  "photos/promo/promo-2.jpg",
  "photos/promo/promo-3.jpg",
  "photos/onecikanlar/tatli-severler.jpg",
  "photos/onecikanlar/mutluluga-doyma-zamani.jpg",
];

async function downloadOne(remotePath) {
  const url = new URL(remotePath, BASE).href;
  const dest = path.join(out, remotePath.replace(/\//g, path.sep));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  fs.mkdirSync(path.join(out, "css"), { recursive: true });
  for (const file of FILES) {
    try {
      await downloadOne(file);
      console.log("OK", file);
    } catch (e) {
      console.warn("SKIP", file, e.message);
    }
  }

  const cigkofteSrc = path.join(root, "server", "seed", "cigkofte");
  const urunlerDest = path.join(out, "photos", "urunler");
  fs.mkdirSync(urunlerDest, { recursive: true });
  for (const f of fs.readdirSync(cigkofteSrc).filter((x) => x.endsWith(".jpg"))) {
    fs.copyFileSync(path.join(cigkofteSrc, f), path.join(urunlerDest, f));
  }

  const styleSrc = path.join(out, "assets", "css", "style.css");
  let css = fs.readFileSync(styleSrc, "utf8");
  css = css.replace(/url\(\.\.\/images\//g, "url(/oses/assets/images/");
  fs.writeFileSync(path.join(out, "css", "style.css"), css);

  const promoCss = `
/* React promo slider — oses.com.tr lightslider yerine */
.promo.low { height: 550px; overflow: hidden; position: relative; }
#promo { list-style: none; padding: 0; margin: 0; height: 100%; position: relative; }
#promo li { position: absolute; inset: 0; opacity: 0; transition: opacity .6s ease; pointer-events: none; }
#promo li.is-active { opacity: 1; z-index: 1; pointer-events: auto; }
#promo li a, #promo li img { display: block; width: 100%; height: 550px; object-fit: cover; }
.oses-promo-dots { position: absolute; left: 0; right: 0; bottom: 18px; z-index: 2; text-align: center; margin: 0; padding: 0; list-style: none; }
.oses-promo-dots li { display: inline-block; margin: 0 4px; }
.oses-promo-dots button { width: 16px; height: 16px; border-radius: 8px; background: #fff; border: 5px solid #fff; padding: 0; cursor: pointer; }
.oses-promo-dots li.is-active button { background: #3d6100; }
.single-product .btn-add { border: none; background: #97d700; color: #fff; border-radius: 5px; padding: 8px 16px; font-weight: 600; cursor: pointer; width: 100%; }
.single-product .btn-add:hover { background: #77a60a; }
.single-product .price { color: #d91423; font-size: 1rem; margin: 0; }
.single-product .price b { font-size: 1.2rem; }
@media (max-width: 767.98px) {
  .promo.low, #promo li a, #promo li img { height: 250px; }
}
`;
  fs.writeFileSync(path.join(out, "css", "oses-promo.css"), promoCss);
  console.log("Done -> public/oses/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
