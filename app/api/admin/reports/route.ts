import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin";
import { listReports } from "@/lib/store";
import type { ReportStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = checkAdmin(req);
  if (denied) return denied;
  const s = new URL(req.url).searchParams.get("status") as ReportStatus;
  const status: ReportStatus = ["en_attente", "verifie", "rejete"].includes(s) ? s : "en_attente";
  return NextResponse.json(await listReports(status), { headers: { "Cache-Control": "no-store" } });
}
