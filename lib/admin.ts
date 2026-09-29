import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

/** Retourne une réponse d'erreur si le jeton admin est absent/incorrect, sinon null. */
export function checkAdmin(req: Request): NextResponse | null {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return NextResponse.json({ error: "Admin désactivé (ADMIN_TOKEN non défini)." }, { status: 503 });
  const got = Buffer.from(req.headers.get("x-admin-token") ?? "");
  const want = Buffer.from(expected);
  if (got.length !== want.length || !timingSafeEqual(got, want))
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  return null;
}
