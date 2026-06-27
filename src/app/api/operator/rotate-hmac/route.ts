import { NextResponse } from "next/server";
import { getOperatorSession } from "@/lib/operator-auth";
import { rotateHmac } from "@/lib/operator-store";
import crypto from "crypto";

export async function POST(req: Request) {
  const ok = await getOperatorSession();
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const tenantId = Number(body.tenant_id);
  if (!Number.isFinite(tenantId)) {
    return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  }
  const newKey = (body.new_key as string) || crypto.randomBytes(32).toString("hex");
  await rotateHmac(tenantId, newKey);
  return NextResponse.json({ ok: true, new_key: newKey });
}
