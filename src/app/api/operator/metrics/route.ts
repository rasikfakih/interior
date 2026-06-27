import { NextResponse } from "next/server";
import { getOperatorSession } from "@/lib/operator-auth";
import { getMetrics, getAuditLog } from "@/lib/operator-store";

export async function GET() {
  const ok = await getOperatorSession();
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({
    ok: true,
    ...(await getMetrics()),
    audit: await getAuditLog(20),
  });
}
