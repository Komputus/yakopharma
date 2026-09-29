import { NextResponse } from "next/server";
import { createReport, getPharmacy } from "@/lib/store";
import { REPORT_TYPES, type ReportType } from "@/lib/types";

// Anti-abus simple (mémoire du process) : 5 signalements / 10 min / IP.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 600_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (limited(ip)) return NextResponse.json({ error: "Trop de signalements, réessayez plus tard." }, { status: 429 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const type = body.report_type as ReportType;
  if (!REPORT_TYPES.includes(type)) return NextResponse.json({ error: "Type invalide." }, { status: 400 });

  const note = String(body.note ?? "").trim().slice(0, 500);
  let pharmacyId: number | null = null;
  if (type === "nouvelle_pharmacie") {
    if (note.length < 5) return NextResponse.json({ error: "Indiquez le nom et le quartier de la pharmacie." }, { status: 400 });
  } else {
    pharmacyId = Number(body.pharmacy_id);
    if (!Number.isInteger(pharmacyId) || !(await getPharmacy(pharmacyId)))
      return NextResponse.json({ error: "Pharmacie introuvable." }, { status: 400 });
  }

  // Toujours "en_attente" : rien n'est publié sans modération.
  await createReport(pharmacyId, type, note);
  return NextResponse.json({ ok: true }, { status: 201 });
}
