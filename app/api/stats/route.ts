import { NextResponse } from "next/server";
import { recordStat, STAT_EVENTS, type StatEvent } from "@/lib/portal";
import { clientIp, rateLimited } from "@/lib/ratelimit";

// Compteur anonyme : on ne stocke que (pharmacie, jour, type) — jamais l'IP ni un identifiant.
export async function POST(req: Request) {
  if (/bot|crawl|spider|preview/i.test(req.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });
  const body = await req.json().catch(() => null);
  const id = Number(body?.pharmacy_id);
  const event = body?.event as StatEvent;
  if (!Number.isInteger(id) || !STAT_EVENTS.includes(event)) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  // L'IP sert seulement à limiter le gonflement des chiffres (en mémoire, non enregistrée).
  if (rateLimited(`stat:${clientIp(req)}:${id}`, 20, 600_000)) return new NextResponse(null, { status: 204 });
  await recordStat(id, event);
  return new NextResponse(null, { status: 204 });
}
