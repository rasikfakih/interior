import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { getPlanUsage, getTenantPlan } from "@/lib/billing";
import { ensureMigrated, pgMany } from "@/lib/pg";
import { resolveAdminTenantId } from "@/lib/theme";

export const dynamic = "force-dynamic";

/** GET /api/billing/current — tenant plan + live usage + invoices. */
export async function GET() {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const plan = await getTenantPlan(tenantId);
  const usage = await getPlanUsage(tenantId);
  await ensureMigrated();
  const subs = await pgMany<Record<string, unknown>>(
    `SELECT s.id, s.plan_id, s.provider, s.provider_subscription_id, s.status,
            s.current_period_start, s.current_period_end, s.created_at,
            p.name AS plan_name, p.price_inr
     FROM subscriptions s
     LEFT JOIN plans p ON p.id = s.plan_id
     WHERE s.tenant_id = $1
     ORDER BY s.created_at DESC
     LIMIT 20`,
    [tenantId]
  );
  const subscriptions = subs.map((s) => ({
    id: String(s.id),
    planId: String(s.plan_id ?? ""),
    planName: String(s.plan_name ?? s.plan_id ?? ""),
    provider: String(s.provider ?? "manual"),
    providerSubscriptionId: String(s.provider_subscription_id ?? ""),
    status: String(s.status ?? "pending"),
    amountInr: Number(s.price_inr ?? 0),
    periodStart: s.current_period_start ?? null,
    periodEnd: s.current_period_end ?? null,
    createdAt: s.created_at ?? null,
  }));
  return NextResponse.json({ tenantId, plan, usage, subscriptions });
}
