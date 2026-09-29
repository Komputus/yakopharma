import { createHash, randomInt } from "crypto";
import { pool } from "./store";
import { readLocalState, writeLocalState } from "./local";
import { MOCK_PHARMACIES } from "./mock-data";

export type PortalGarde = {
  id: number;
  pharmacy_id: number;
  pharmacy_name?: string | null;
  garde_start: string;
  garde_end: string;
  approved: boolean;
  source_document: string | null;
};

export type PharmacyInfoPatch = { phone?: string; opening_hours?: string; address?: string };

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const cleanCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, "");

// 10 caractères sans 0/O/1/I/L (≈ 50 bits) — affiché XXXXX-XXXXX. Stocké uniquement haché.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function newCode() {
  const raw = Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

// ---------- Accès ----------
export async function createAccessCode(pharmacyId: number): Promise<string | null> {
  const code = newCode();
  const hash = sha(cleanCode(code));
  if (pool) {
    const ok = await pool.query("SELECT 1 FROM pharmacy WHERE id=$1", [pharmacyId]);
    if (!ok.rowCount) return null;
    await pool.query(
      `INSERT INTO pharmacy_access (pharmacy_id, code_hash) VALUES ($1,$2)
       ON CONFLICT (pharmacy_id) DO UPDATE SET code_hash=EXCLUDED.code_hash, created_at=now(), last_login_at=NULL`,
      [pharmacyId, hash]
    );
    return code;
  }
  if (!MOCK_PHARMACIES.some((p) => p.id === pharmacyId)) return null;
  const s = await readLocalState();
  for (const [h, id] of Object.entries(s.access)) if (id === pharmacyId) delete s.access[h];
  s.access[hash] = pharmacyId;
  await writeLocalState(s);
  return code;
}

export async function loginWithCode(input: string): Promise<number | null> {
  const clean = cleanCode(input);
  if (clean.length !== 10) return null;
  const hash = sha(clean);
  if (pool) {
    const { rows } = await pool.query("UPDATE pharmacy_access SET last_login_at=now() WHERE code_hash=$1 RETURNING pharmacy_id::int AS id", [hash]);
    return rows[0]?.id ?? null;
  }
  return (await readLocalState()).access[hash] ?? null;
}

// ---------- Informations de la pharmacie ----------
export async function updatePharmacyInfo(id: number, patch: PharmacyInfoPatch) {
  if (pool) {
    await pool.query(
      `UPDATE pharmacy SET phone=COALESCE($2,phone), opening_hours=COALESCE($3,opening_hours),
         address=COALESCE($4,address), last_updated_at=now() WHERE id=$1`,
      [id, patch.phone ?? null, patch.opening_hours ?? null, patch.address ?? null]
    );
    return;
  }
  const s = await readLocalState();
  s.overrides[id] = { ...s.overrides[id], ...patch };
  await writeLocalState(s);
}

// ---------- Gardes ----------
export async function listOwnGardes(pharmacyId: number): Promise<PortalGarde[]> {
  if (pool) {
    const { rows } = await pool.query(
      `SELECT id::int AS id, pharmacy_id::int AS pharmacy_id, garde_start, garde_end, approved, source_document
       FROM garde_schedule WHERE pharmacy_id=$1 AND garde_end > now() - interval '30 days'
       ORDER BY garde_start DESC LIMIT 50`,
      [pharmacyId]
    );
    return rows;
  }
  const cutoff = Date.now() - 30 * 864e5;
  return (await readLocalState()).gardes
    .filter((g) => g.pharmacy_id === pharmacyId && Date.parse(g.garde_end) > cutoff)
    .sort((a, b) => b.garde_start.localeCompare(a.garde_start));
}

/** Garde déclarée par la pharmacie : NON publiée tant qu'un admin ne l'approuve pas. */
export async function declareGarde(pharmacyId: number, start: Date, end: Date) {
  const doc = "Déclarée par la pharmacie (portail)";
  if (pool) {
    await pool.query(
      `INSERT INTO garde_schedule (pharmacy_id, garde_start, garde_end, source_document, approved)
       VALUES ($1,$2,$3,$4,false) ON CONFLICT (pharmacy_id, garde_start) DO NOTHING`,
      [pharmacyId, start, end, doc]
    );
    return;
  }
  const s = await readLocalState();
  s.gardes.push({
    id: Math.max(0, ...s.gardes.map((g) => g.id)) + 1,
    pharmacy_id: pharmacyId,
    garde_start: start.toISOString(),
    garde_end: end.toISOString(),
    approved: false,
    source_document: doc,
  });
  await writeLocalState(s);
}

export async function endGardeNow(pharmacyId: number) {
  if (pool) {
    await pool.query("UPDATE garde_schedule SET garde_end=now() WHERE pharmacy_id=$1 AND approved AND now() BETWEEN garde_start AND garde_end", [pharmacyId]);
    return;
  }
  const s = await readLocalState();
  const now = new Date().toISOString();
  s.gardes.forEach((g) => {
    if (g.pharmacy_id === pharmacyId && g.approved && g.garde_start <= now && now <= g.garde_end) g.garde_end = now;
  });
  s.overrides[pharmacyId] = { ...s.overrides[pharmacyId], garde_off: true };
  await writeLocalState(s);
}

// ---------- Modération des gardes déclarées ----------
export async function listPendingGardes(): Promise<PortalGarde[]> {
  if (pool) {
    const { rows } = await pool.query(
      `SELECT g.id::int AS id, g.pharmacy_id::int AS pharmacy_id, p.name AS pharmacy_name, g.garde_start, g.garde_end, g.approved, g.source_document
       FROM garde_schedule g JOIN pharmacy p ON p.id=g.pharmacy_id WHERE NOT g.approved ORDER BY g.garde_start LIMIT 200`
    );
    return rows;
  }
  return (await readLocalState()).gardes
    .filter((g) => !g.approved)
    .map((g) => ({ ...g, pharmacy_name: MOCK_PHARMACIES.find((p) => p.id === g.pharmacy_id)?.name ?? null }));
}

export async function moderateGarde(id: number, approve: boolean): Promise<boolean> {
  if (pool) {
    const r = approve
      ? await pool.query("UPDATE garde_schedule SET approved=true WHERE id=$1 AND NOT approved", [id])
      : await pool.query("DELETE FROM garde_schedule WHERE id=$1 AND NOT approved", [id]);
    return !!r.rowCount;
  }
  const s = await readLocalState();
  const g = s.gardes.find((x) => x.id === id && !x.approved);
  if (!g) return false;
  if (approve) {
    g.approved = true;
    if (s.overrides[g.pharmacy_id]) s.overrides[g.pharmacy_id].garde_off = false;
  } else s.gardes = s.gardes.filter((x) => x !== g);
  await writeLocalState(s);
  return true;
}
