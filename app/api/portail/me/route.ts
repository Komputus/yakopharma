import { NextResponse } from "next/server";
import { getPharmacy } from "@/lib/store";
import { listOwnGardes, updatePharmacyInfo, type PharmacyInfoPatch } from "@/lib/portal";
import { getSessionPharmacyId } from "@/lib/session";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const id = await getSessionPharmacyId();
  if (!id) return NextResponse.json({ error: "Non connecté." }, { status: 401, headers: NO_STORE });
  const pharmacy = await getPharmacy(id);
  if (!pharmacy) return NextResponse.json({ error: "Pharmacie introuvable." }, { status: 404, headers: NO_STORE });
  return NextResponse.json({ pharmacy, gardes: await listOwnGardes(id) }, { headers: NO_STORE });
}

const LIMITS = { phone: 30, opening_hours: 80, address: 150 } as const;

export async function PATCH(req: Request) {
  const id = await getSessionPharmacyId();
  if (!id) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const patch: PharmacyInfoPatch = {};
  for (const k of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    if (body[k] === undefined) continue;
    const v = String(body[k]).trim();
    if (v.length > LIMITS[k]) return NextResponse.json({ error: `Champ trop long : ${k}` }, { status: 400 });
    if (k === "phone" && v && !/^[+\d][\d\s.-]{5,}$/.test(v)) return NextResponse.json({ error: "Numéro de téléphone invalide." }, { status: 400 });
    if (v) patch[k] = v; // un champ vide ne supprime rien
  }
  await updatePharmacyInfo(id, patch);
  return NextResponse.json({ ok: true });
}
