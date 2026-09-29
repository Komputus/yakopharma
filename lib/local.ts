import { promises as fs } from "fs";
import path from "path";
import type { Pharmacy } from "./types";

// État local du portail pharmacie quand DATABASE_URL n'est pas défini (dev uniquement).
export type LocalGarde = { id: number; pharmacy_id: number; garde_start: string; garde_end: string; approved: boolean; source_document: string };
export type LocalState = {
  access: Record<string, number>; // code_hash -> pharmacy_id
  overrides: Record<string, { phone?: string; opening_hours?: string; address?: string; garde_off?: boolean }>;
  gardes: LocalGarde[];
  stats: Record<string, number>; // id|YYYY-MM-DD|event -> compteur
};

const FILE = path.join(process.cwd(), "data", "portal.local.json");
const empty = (): LocalState => ({ access: {}, overrides: {}, gardes: [], stats: {} });

export async function readLocalState(): Promise<LocalState> {
  try {
    return { ...empty(), ...JSON.parse(await fs.readFile(FILE, "utf8")) };
  } catch {
    return empty();
  }
}
export const writeLocalState = (s: LocalState) => fs.writeFile(FILE, JSON.stringify(s, null, 2));

/** Applique les modifications du portail sur une pharmacie fictive. */
export function applyLocal(p: Pharmacy, s: LocalState): Pharmacy {
  const o = s.overrides[p.id] ?? {};
  const now = Date.now();
  const declared = s.gardes.some((g) => g.pharmacy_id === p.id && g.approved && Date.parse(g.garde_start) <= now && now <= Date.parse(g.garde_end));
  return {
    ...p,
    phone: o.phone ?? p.phone,
    opening_hours: o.opening_hours ?? p.opening_hours,
    address: o.address ?? p.address,
    is_garde_active: !o.garde_off && (p.is_garde_active || declared),
  };
}
