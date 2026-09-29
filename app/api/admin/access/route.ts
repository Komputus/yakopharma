import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin";
import { createAccessCode } from "@/lib/portal";

// Génère (ou remplace) le code d'accès d'une pharmacie. Le code n'est affiché qu'ici, une seule fois.
export async function POST(req: Request) {
  const denied = checkAdmin(req);
  if (denied) return denied;
  const { pharmacy_id } = await req.json().catch(() => ({}));
  const id = Number(pharmacy_id);
  const code = Number.isInteger(id) ? await createAccessCode(id) : null;
  return code
    ? NextResponse.json({ code }, { headers: { "Cache-Control": "no-store" } })
    : NextResponse.json({ error: "Pharmacie introuvable." }, { status: 404 });
}
