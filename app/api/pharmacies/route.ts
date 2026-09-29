import { NextResponse } from "next/server";
import { searchPharmacies } from "@/lib/store";
import { ABIDJAN_CENTER } from "@/lib/geo";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const lat = parseFloat(sp.get("lat") ?? "");
  const lng = parseFloat(sp.get("lng") ?? "");
  const data = await searchPharmacies({
    lat: Number.isFinite(lat) ? lat : ABIDJAN_CENTER.lat,
    lng: Number.isFinite(lng) ? lng : ABIDJAN_CENTER.lng,
    garde: sp.get("garde") === "1",
    commune: sp.get("commune")?.slice(0, 60) || undefined,
    q: sp.get("q")?.trim().slice(0, 60) || undefined,
  });
  // Courte durée : le statut de garde change, mais reste utile hors-ligne via le service worker.
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=60" } });
}
