import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin";
import { listPendingGardes } from "@/lib/portal";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = checkAdmin(req);
  if (denied) return denied;
  return NextResponse.json(await listPendingGardes(), { headers: { "Cache-Control": "no-store" } });
}
