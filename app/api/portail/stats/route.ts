import { NextResponse } from "next/server";
import { getStats } from "@/lib/portal";
import { getSessionPharmacyId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const id = await getSessionPharmacyId();
  if (!id) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  return NextResponse.json(await getStats(id), { headers: { "Cache-Control": "no-store" } });
}
