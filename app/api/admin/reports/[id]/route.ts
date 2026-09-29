import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin";
import { moderateReport } from "@/lib/store";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = checkAdmin(req);
  if (denied) return denied;
  const { status } = await req.json().catch(() => ({}));
  if (status !== "verifie" && status !== "rejete") return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  const ok = await moderateReport(Number((await params).id), status);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "introuvable" }, { status: 404 });
}
