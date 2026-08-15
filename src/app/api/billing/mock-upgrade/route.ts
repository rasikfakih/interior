import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { activateSubscription } from "@/lib/billing";
import { resolveAdminTenantId } from "@/lib/theme";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/mock-upgrade {plan_id}
 *
 * Dev/testing shortcut: activates the plan for the session tenant
 * without a payment provider, exactly as the webhook would. Used by
 * the smoke suite and the mock checkout Pay button (dev mode).
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  let body: Record<string, unknown> | undefined;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const planId = String(body?.plan_id ?? "").trim();
  if (!planId) {
    return NextResponse.json({ error: "plan_id is required." }, { status: 400 });
  }
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  await activateSubscription({
    tenantId,
    planId,
    provider: "manual",
    providerSubscriptionId: `mock_${crypto.randomUUID().slice(0, 8)}`,
    billingCycle: String(body?.billing_cycle ?? "monthly"),
  });
  return NextResponse.json({ ok: true, plan_id: planId });
}
