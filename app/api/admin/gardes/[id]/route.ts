import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin";
import { moderateGarde } from "@/lib/portal";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = checkAdmin(req);
  if (denied) return denied;
  const { status } = await req.json().catch(() => ({}));
  if (status !== "approuve" && status !== "rejete") return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  const ok = await moderateGarde(Number((await params).id), status === "approuve");
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "introuvable" }, { status: 404 });
}
