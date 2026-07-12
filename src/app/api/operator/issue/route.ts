import { NextResponse } from "next/server";
import { getOperatorSession } from "@/lib/operator-auth";
import { signLicense } from "@/lib/operator-store";
import { bump } from "@/lib/revalidate";

export async function POST(req: Request) {
  const ok = await getOperatorSession();
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const tenantId = Number(body.tenant_id);
  if (!Number.isFinite(tenantId)) {
    return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  }
  try {
    const license = await signLicense(tenantId, body.expires_at || null);
    bump({ kind: "install" });
    return NextResponse.json({ ok: true, license });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
