import { NextResponse } from "next/server";
import { loginWithCode } from "@/lib/portal";
import { clientIp, rateLimited } from "@/lib/ratelimit";
import { setSession } from "@/lib/session";

export async function POST(req: Request) {
  if (rateLimited("login:" + clientIp(req), 10))
    return NextResponse.json({ error: "Trop de tentatives, réessayez dans quelques minutes." }, { status: 429 });
  const { code } = await req.json().catch(() => ({}));
  const id = typeof code === "string" ? await loginWithCode(code) : null;
  if (!id) return NextResponse.json({ error: "Code incorrect." }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  setSession(res, id);
  return res;
}
