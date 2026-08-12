import { NextResponse } from "next/server";
import { getOperatorSession } from "@/lib/operator-auth";
import { listTenants, probeTenant } from "@/lib/operator-store";

export type ProbeResult = {
  tenantId: number;
  slug: string | null;
  base: string;
  status: "ok" | "down" | "unknown";
  ms: number | null;
  ts: string;
  reason?: string;
};

/**
 * GET /api/operator/health - current persisted health state for every
 * tenant (status dot + last probe time) without probing.
 *
 * POST /api/operator/health - probe every tenant's {base}/api/health
 * endpoint (reusing the uptime-checker contract) and persist results.
 * Sequential so a slow tenant can't fan out a storm of probes.
 */
export async function GET() {
  const ok = await getOperatorSession();
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenants = await listTenants();
  return NextResponse.json({
    ok: true,
    items: tenants.map((t) => ({
      id: t.id,
      slug: t.slug,
      studio_name: t.studio_name,
      domain: t.domain ?? null,
      state: t.state ?? "pending",
      health_status: t.health_status ?? "unknown",
      last_health_at: t.last_health_at ?? null,
    })),
  });
}

export async function POST() {
  const ok = await getOperatorSession();
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenants = await listTenants();
  const results: ProbeResult[] = [];
  for (const t of tenants) {
    try {
      results.push(await probeTenant(t.id));
    } catch {
      results.push({
        tenantId: t.id,
        slug: t.slug ?? null,
        base: "n/a",
        status: "unknown",
        ms: null,
        ts: new Date().toISOString(),
        reason: "probe failed",
      });
    }
  }
  return NextResponse.json({ ok: true, results });
}
