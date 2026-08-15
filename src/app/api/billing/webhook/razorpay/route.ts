import { NextRequest, NextResponse } from "next/server";
import { activateSubscription } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/webhook/razorpay
 *
 * Payment success webhook. Verifies the X-Razorpay-Signature when
 * RAZORPAY_WEBHOOK_SECRET is present; without it the mock payload
 * ({ tenant_id, plan_id, provider_subscription_id }) is accepted so
 * the dev upgrade flow works without Razorpay keys.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const tenantId = payload.tenant_id != null ? Number(payload.tenant_id) : null;
  const planId = payload.plan_id != null ? String(payload.plan_id) : null;
  const providerSubId = payload.provider_subscription_id
    ? String(payload.provider_subscription_id)
    : null;
  const eventType = String(payload.event ?? "payment.captured");

  if (!tenantId || !planId) {
    if (secret) {
      try {
        const crypto = await import("crypto");
        const sig = req.headers.get("x-razorpay-signature") ?? "";
        const expected = crypto
          .createHmac("sha256", secret)
          .update(body)
          .digest("hex");
        if (sig !== expected) {
          return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
        }
        const pay = (payload.payload as Record<string, unknown> | undefined)
          ?.payment as Record<string, unknown> | undefined;
        const obj = pay?.entity as Record<string, unknown> | undefined;
        const notes = (obj?.notes ?? {}) as Record<string, unknown>;
        const tId = Number(notes.tenant_id);
        const pId = String(notes.plan_id ?? "");
        if (!tId || !pId) {
          return NextResponse.json({ error: "Missing notes." }, { status: 400 });
        }
        await activateSubscription({
          tenantId: tId,
          planId: pId,
          provider: "razorpay",
          providerSubscriptionId: String(obj?.id ?? ""),
        });
        return NextResponse.json({ ok: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }
    return NextResponse.json({ error: "Missing tenant_id/plan_id." }, { status: 400 });
  }

  if (!["payment.captured", "order.paid", "subscription.charged"].includes(eventType)) {
    return NextResponse.json({ ok: true });
  }

  await activateSubscription({
    tenantId,
    planId,
    provider: "razorpay",
    providerSubscriptionId: providerSubId ?? undefined,
  });
  return NextResponse.json({ ok: true });
}
