import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const COOKIE = "yako_pro";
const MAX_AGE = 7 * 24 * 3600;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  // Sans secret, on n'autorise le repli qu'en développement.
  if (process.env.NODE_ENV !== "production") return "dev-only-secret-not-for-production";
  throw new Error("SESSION_SECRET (16+ caractères) requis en production");
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function setSession(res: NextResponse, pharmacyId: number) {
  const payload = `${pharmacyId}.${Math.floor(Date.now() / 1000) + MAX_AGE}`;
  res.cookies.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSession(res: NextResponse) {
  res.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Id de la pharmacie connectée, ou null. */
export async function getSessionPharmacyId(): Promise<number | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [id, exp, sig] = raw.split(".");
  const expected = Buffer.from(sign(`${id}.${exp}`));
  const got = Buffer.from(sig ?? "");
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  const n = Number(id);
  return Number.isInteger(n) ? n : null;
}
