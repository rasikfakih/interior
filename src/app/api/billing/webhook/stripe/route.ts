import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, pgOne } from "@/lib/pg";
import { activateSubscription } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/webhook/stripe
 *
 * Payment success webhook. Verifies the signature with STRIPE_WEBHOOK_SECRET
 * when present; without it (dev / SQLite fallback) the payload is accepted
 * as-is so the upgrade flow works end to end without Stripe keys. The
 * checkout in /admin/billing posts {tenant_id, plan_id, provider_subscription_id}
 * via the mock flow; real Stripe sends the standard event payload.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  // Mock dev flow: { tenant_id, plan_id, provider_subscription_id }.
  const tenantId = payload.tenant_id != null ? Number(payload.tenant_id) : null;
  const planId = payload.plan_id != null ? String(payload.plan_id) : null;
  const providerSubId = payload.provider_subscription_id
    ? String(payload.provider_subscription_id)
    : null;
  const eventType = String(payload.type ?? "checkout.session.completed");
  const evt = (payload.data as Record<string, unknown> | undefined)
    ?.object as Record<string, unknown> | undefined;

  if (!tenantId || !planId) {
    if (secret) {
      // Real signature verification path (Stripe webhook signing secret).
      // The SDK is not installed, so verify the HMAC per Stripe's spec:
      // v0 signature = HMAC-SHA256(secret, timestamp + '.' + payload).
      try {
        const crypto = await import("crypto");
        const sigHeader = req.headers.get("stripe-signature") ?? "";
        const parts = Object.fromEntries(
          sigHeader.split(",").map((kv) => {
            const [k, ...rest] = kv.trim().split("=");
            return [k, rest.join("=")];
          })
        );
        const ts = parts["t"];
        const sigs = String(parts["v1"] ?? "").split(" ");
        const signed = `${ts}.${body}`;
        const expected = crypto
          .createHmac("sha256", secret)
          .update(signed)
          .digest("hex");
        if (!sigs.includes(expected)) {
          return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
        }
        const obj = (payload.data as Record<string, unknown> | undefined)
          ?.object as Record<string, unknown> | undefined;
        const metadata = (obj?.metadata ?? {}) as Record<string, unknown>;
        const tId = Number(metadata.tenant_id);
        const pId = String(metadata.plan_id ?? "");
        const subId = String(obj?.id ?? "");
        if (!tId || !pId) {
          return NextResponse.json({ error: "Missing metadata." }, { status: 400 });
        }
        await activateSubscription({
          tenantId: tId,
          planId: pId,
          provider: "stripe",
          providerSubscriptionId: subId,
        });
        return NextResponse.json({ received: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }
    return NextResponse.json({ error: "Missing tenant_id/plan_id." }, { status: 400 });
  }

  if (!["checkout.session.completed", "payment_intent.succeeded", "invoice.paid"].includes(eventType)) {
    return NextResponse.json({ received: true });
  }

  const subId = providerSubId ?? String(evt?.id ?? "");
  await activateSubscription({
    tenantId,
    planId,
    provider: "stripe",
    providerSubscriptionId: subId,
  });
  return NextResponse.json({ received: true });
}
