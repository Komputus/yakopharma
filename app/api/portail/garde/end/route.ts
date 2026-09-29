import { NextResponse } from "next/server";
import { endGardeNow } from "@/lib/portal";
import { getSessionPharmacyId } from "@/lib/session";

export async function POST() {
  const id = await getSessionPharmacyId();
  if (!id) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  await endGardeNow(id);
  return NextResponse.json({ ok: true });
}
