// Import des pharmacies et des gardes depuis des CSV, avec géocodage Nominatim des adresses sans coordonnées.
//   npm run db:import                      -> data/import/pharmacies.csv (+ garde.csv s'il existe)
//   npm run db:import -- --dry-run         -> valide et géocode sans écrire en base
//   npm run db:import -- --dir=data/exemple
// Relancer est sans danger : upsert sur (nom, commune) et (pharmacie, début de garde).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import pg from "pg";

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const dir = args.find((a) => a.startsWith("--dir="))?.slice(6) ?? "data/import";
const SOURCES = ["ordre_pharmaciens", "communautaire", "manuel"];
const CACHE_FILE = "data/geocode-cache.json";

const readCsv = (f) => parse(readFileSync(f, "utf8"), { columns: true, skip_empty_lines: true, trim: true, bom: true });
const cache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, "utf8")) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Politique Nominatim : 1 requête/s max, User-Agent identifiable.
async function geocode(row) {
  const query = [row.address, row.quartier, row.commune, "Abidjan", "Côte d'Ivoire"].filter(Boolean).join(", ");
  if (query in cache) return cache[query];
  await sleep(1100);
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ci&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": "YakoPharma-import/0.1 (contact: hermannk555@gmail.com)" } });
  const hit = res.ok ? (await res.json())[0] : null;
  const out = hit ? { lat: +hit.lat, lng: +hit.lon } : null;
  cache[query] = out;
  mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  return out;
}

const pharmaFile = path.join(dir, "pharmacies.csv");
if (!existsSync(pharmaFile)) throw new Error(`${pharmaFile} introuvable (modèle : data/exemple/pharmacies.csv)`);

const rows = [];
const skipped = [];
for (const [i, r] of readCsv(pharmaFile).entries()) {
  const line = i + 2;
  if (!r.name || !r.commune) { skipped.push(`ligne ${line}: name/commune manquant`); continue; }
  const source = r.source || "manuel";
  if (!SOURCES.includes(source)) { skipped.push(`ligne ${line} (${r.name}): source invalide "${source}"`); continue; }
  let lat = parseFloat(r.lat), lng = parseFloat(r.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const g = await geocode(r);
    if (!g) { skipped.push(`ligne ${line} (${r.name}): adresse non géocodée — ajoutez lat/lng à la main`); continue; }
    ({ lat, lng } = g);
  }
  // Garde-fou : Côte d'Ivoire ≈ lat 4.3–10.8, lng -8.7 – -2.4
  if (lat < 4.3 || lat > 10.8 || lng < -8.7 || lng > -2.4) { skipped.push(`ligne ${line} (${r.name}): coordonnées hors Côte d'Ivoire (${lat}, ${lng})`); continue; }
  rows.push({ ...r, source, lat, lng, verified: ["1", "true", "oui"].includes(String(r.verified).toLowerCase()) });
}

const gardeFile = path.join(dir, "garde.csv");
const gardes = existsSync(gardeFile) ? readCsv(gardeFile) : [];

console.log(`${rows.length} pharmacie(s) valides, ${skipped.length} ignorée(s), ${gardes.length} garde(s) à importer${dry ? " [dry-run]" : ""}`);
skipped.forEach((s) => console.log("  ! " + s));
if (dry) process.exit(0);

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL manquant (voir .env.example)");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  for (const r of rows) {
    await client.query(
      `INSERT INTO pharmacy (name, address, commune, quartier, lat, lng, phone, opening_hours, verified, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (name, commune) DO UPDATE SET address=EXCLUDED.address, quartier=EXCLUDED.quartier, lat=EXCLUDED.lat,
         lng=EXCLUDED.lng, phone=EXCLUDED.phone, opening_hours=EXCLUDED.opening_hours, verified=EXCLUDED.verified,
         source=EXCLUDED.source, last_updated_at=now()`,
      [r.name, r.address || null, r.commune, r.quartier || null, r.lat, r.lng, r.phone || null, r.opening_hours || null, r.verified, r.source]
    );
  }
  let ok = 0;
  for (const [i, g] of gardes.entries()) {
    const res = await client.query(
      `INSERT INTO garde_schedule (pharmacy_id, garde_start, garde_end, source_document)
       SELECT id, $3::timestamptz, $4::timestamptz, $5 FROM pharmacy WHERE name=$1 AND commune=$2
       ON CONFLICT (pharmacy_id, garde_start) DO UPDATE SET garde_end=EXCLUDED.garde_end, source_document=EXCLUDED.source_document`,
      [g.name, g.commune, g.garde_start, g.garde_end, g.source_document || null]
    );
    if (res.rowCount) ok++;
    else console.log(`  ! garde ligne ${i + 2}: pharmacie "${g.name}" (${g.commune}) inconnue`);
  }
  await client.query("COMMIT");
  console.log(`Import terminé : ${rows.length} pharmacie(s), ${ok}/${gardes.length} garde(s).`);
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  await client.end();
}
