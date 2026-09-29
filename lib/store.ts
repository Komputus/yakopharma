import { promises as fs } from "fs";
import path from "path";
import { Pool } from "pg";
import { haversineKm } from "./geo";
import { MOCK_PHARMACIES } from "./mock-data";
import { applyLocal, readLocalState } from "./local";
import type { Pharmacy, ReportStatus, ReportType, SearchParams, UserReport } from "./types";

// Deux backends : PostGIS si DATABASE_URL est défini, sinon données fictives + fichier local (dev).
export const pool: Pool | null = process.env.DATABASE_URL
  ? ((globalThis as any).__yakoPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5 }))
  : null;

export const usingDb = () => pool !== null;

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const PHARMACY_COLS = `id::int AS id, name, address, commune, quartier, lat, lng, phone, opening_hours,
  verified, source, last_updated_at, is_garde_active`;

export async function searchPharmacies(p: SearchParams): Promise<Pharmacy[]> {
  if (pool) {
    const { rows } = await pool.query(
      `SELECT ${PHARMACY_COLS},
              ST_Distance(geom, ST_SetSRID(ST_MakePoint($2,$1),4326)::geography) / 1000 AS distance_km
       FROM pharmacy_with_garde
       WHERE ($3::bool = false OR is_garde_active)
         AND ($4::text IS NULL OR unaccent_lower(commune) = unaccent_lower($4))
         AND ($5::text IS NULL OR unaccent_lower(name || ' ' || coalesce(quartier,'') || ' ' || commune) LIKE '%' || unaccent_lower($5) || '%')
       ORDER BY distance_km LIMIT 100`,
      [p.lat, p.lng, p.garde, p.commune || null, p.q || null]
    );
    return rows;
  }
  const local = await readLocalState();
  return MOCK_PHARMACIES.map((x) => applyLocal(x, local))
    .filter((x) => !p.garde || x.is_garde_active)
    .filter((x) => !p.commune || norm(x.commune) === norm(p.commune))
    .filter((x) => !p.q || norm(`${x.name} ${x.quartier} ${x.commune}`).includes(norm(p.q)))
    .map((x) => ({ ...x, distance_km: haversineKm(p.lat, p.lng, x.lat, x.lng) }))
    .sort((a, b) => a.distance_km! - b.distance_km!);
}

export async function getPharmacy(id: number): Promise<Pharmacy | null> {
  if (pool) {
    const { rows } = await pool.query(`SELECT ${PHARMACY_COLS} FROM pharmacy_with_garde WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }
  const m = MOCK_PHARMACIES.find((x) => x.id === id);
  return m ? applyLocal(m, await readLocalState()) : null;
}

// ---------- Signalements ----------
const LOCAL_FILE = path.join(process.cwd(), "data", "reports.local.json");

async function readLocal(): Promise<UserReport[]> {
  try {
    return JSON.parse(await fs.readFile(LOCAL_FILE, "utf8"));
  } catch {
    return [];
  }
}
const writeLocal = (r: UserReport[]) => fs.writeFile(LOCAL_FILE, JSON.stringify(r, null, 2));

export async function createReport(pharmacy_id: number | null, report_type: ReportType, note: string) {
  if (pool) {
    await pool.query("INSERT INTO user_report (pharmacy_id, report_type, note) VALUES ($1,$2,$3)", [pharmacy_id, report_type, note]);
    return;
  }
  const all = await readLocal();
  all.push({
    id: Math.max(0, ...all.map((r) => r.id)) + 1,
    pharmacy_id, report_type, note,
    created_at: new Date().toISOString(),
    status: "en_attente",
  });
  await writeLocal(all);
}

export async function listReports(status: ReportStatus): Promise<UserReport[]> {
  if (pool) {
    const { rows } = await pool.query(
      `SELECT r.id::int AS id, r.pharmacy_id::int AS pharmacy_id, p.name AS pharmacy_name,
              r.report_type, coalesce(r.note,'') AS note, r.created_at, r.status
       FROM user_report r LEFT JOIN pharmacy p ON p.id = r.pharmacy_id
       WHERE r.status = $1 ORDER BY r.created_at DESC LIMIT 200`,
      [status]
    );
    return rows;
  }
  return (await readLocal())
    .filter((r) => r.status === status)
    .map((r) => ({ ...r, pharmacy_name: MOCK_PHARMACIES.find((x) => x.id === r.pharmacy_id)?.name ?? null }))
    .reverse();
}

// Un signalement "vérifié" n'est jamais appliqué seul, sauf « plus_en_garde » qui clôt la garde en cours.
// Les autres types (fermée, horaires, nouvelle pharmacie) restent une décision manuelle de l'admin.
export async function moderateReport(id: number, status: "verifie" | "rejete"): Promise<boolean> {
  if (pool) {
    const { rows } = await pool.query("UPDATE user_report SET status = $2 WHERE id = $1 RETURNING pharmacy_id, report_type", [id, status]);
    if (!rows[0]) return false;
    if (status === "verifie" && rows[0].report_type === "plus_en_garde" && rows[0].pharmacy_id) {
      await pool.query(
        "UPDATE garde_schedule SET garde_end = now() WHERE pharmacy_id = $1 AND now() BETWEEN garde_start AND garde_end",
        [rows[0].pharmacy_id]
      );
    }
    return true;
  }
  const all = await readLocal();
  const r = all.find((x) => x.id === id);
  if (!r) return false;
  r.status = status;
  await writeLocal(all);
  return true;
}
