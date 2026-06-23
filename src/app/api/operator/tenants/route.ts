import { NextResponse } from "next/server";
import { getOperatorSession } from "@/lib/operator-auth";
import { listTenants } from "@/lib/operator-store";

export async function GET() {
  const ok = await getOperatorSession();
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, tenants: listTenants() });
}

export async function POST(req: Request) {
  const ok = await getOperatorSession();
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const slug = (body.slug || "").toString().trim();
  const studio_name = (body.studio_name || "").toString().trim();
  if (!slug || !studio_name) {
    return NextResponse.json({ error: "slug and studio_name required" }, { status: 400 });
  }
  const tier = body.tier === "business" ? "business" : "personal";
  const id = (await import("@/lib/operator-store")).createTenant({
    slug,
    studio_name,
    owner_email: (body.owner_email || "").toString().trim(),
    domain: (body.domain || "").toString().trim() || undefined,
    tier,
  });
  return NextResponse.json({ ok: true, id });
}
