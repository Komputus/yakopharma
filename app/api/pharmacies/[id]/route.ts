import { NextResponse } from "next/server";
import { getPharmacy } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const p = await getPharmacy(Number((await params).id));
  return p ? NextResponse.json(p) : NextResponse.json({ error: "introuvable" }, { status: 404 });
}
