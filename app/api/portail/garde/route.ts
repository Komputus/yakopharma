import { NextResponse } from "next/server";
import { declareGarde } from "@/lib/portal";
import { getSessionPharmacyId } from "@/lib/session";

// Une garde déclarée est "en attente" : elle n'apparaît publiquement qu'après validation admin.
export async function POST(req: Request) {
  const id = await getSessionPharmacyId();
  if (!id) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const start = new Date(body.garde_start);
  const end = new Date(body.garde_end);
  const now = Date.now();
  if (isNaN(+start) || isNaN(+end)) return NextResponse.json({ error: "Dates invalides." }, { status: 400 });
  if (end <= start) return NextResponse.json({ error: "La fin doit être après le début." }, { status: 400 });
  if (+end - +start > 15 * 864e5) return NextResponse.json({ error: "Une garde ne peut pas dépasser 15 jours." }, { status: 400 });
  if (+start < now - 864e5 || +end > now + 90 * 864e5) return NextResponse.json({ error: "Dates hors période autorisée (90 jours à venir)." }, { status: 400 });
  await declareGarde(id, start, end);
  return NextResponse.json({ ok: true }, { status: 201 });
}
