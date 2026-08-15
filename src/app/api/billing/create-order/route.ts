import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgOne, withPgTx } from "@/lib/pg";
import { resolveAdminTenantId } from "@/lib/theme";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/create-order {plan_id, billing_cycle?, provider?}
 *
 * Creates a pending subscription row and returns an order the client
 * can pay. Without provider keys this is a mock order (order_mock_*);
 * with STRIPE_SECRET_KEY / RAZORPAY_KEY_ID+SECRET it calls the real
 * provider REST API over fetch (no SDK dependency). The webhook (or
 * dev mock-upgrade) flips the row to active.
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
  const provider = String(body?.provider ?? "stripe");
  if (!["stripe", "razorpay"].includes(provider)) {
    return NextResponse.json({ error: "provider must be stripe or razorpay." }, { status: 400 });
  }

  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }

  await ensureMigrated();
  const plan = await pgOne<Record<string, unknown>>(
    `SELECT id, name, price_usd, price_inr FROM plans WHERE id = $1 AND is_active = TRUE LIMIT 1`,
    [planId]
  );
  if (!plan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }
  const amountInr = Number(plan.price_inr ?? 0);
  const subscriptionId = crypto.randomUUID();

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const razorpayKey = process.env.RAZORPAY_KEY_ID;
  const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

  let orderId: string;
  const currency = "INR";
  let amount: number = amountInr;
  let mock = true;

  if (provider === "stripe" && stripeKey) {
    try {
      const res = await fetch("https://api.stripe.com/v1/payment_intents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          amount: String(Math.round(amountInr * 100)),
          currency: "inr",
          metadata: `[tenant_id=${tenantId}][plan_id=${planId}]`,
        }),
      });
      const j = (await res.json()) as { id?: string; error?: { message?: string } };
      if (!res.ok || !j.id) {
        return NextResponse.json(
          { error: j.error?.message ?? "Stripe order creation failed." },
          { status: 502 }
        );
      }
      orderId = j.id;
      amount = amountInr;
      mock = false;
    } catch {
      return NextResponse.json(
        { error: "Stripe order creation failed. Try again or use mock checkout." },
        { status: 502 }
      );
    }
  } else if (provider === "razorpay" && razorpayKey && razorpaySecret) {
    try {
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${razorpayKey}:${razorpaySecret}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(amountInr * 100),
          currency: "INR",
          receipt: `tenant_${tenantId}_${planId}`,
          notes: { tenant_id: String(tenantId), plan_id: planId },
        }),
      });
      const j = (await res.json()) as { id?: string; error?: { description?: string } };
      if (!res.ok || !j.id) {
        return NextResponse.json(
          { error: j.error?.description ?? "Razorpay order creation failed." },
          { status: 502 }
        );
      }
      orderId = j.id;
      amount = amountInr;
      mock = false;
    } catch {
      return NextResponse.json(
        { error: "Razorpay order creation failed. Try again or use mock checkout." },
        { status: 502 }
      );
    }
  } else {
    // No provider keys configured: mock order for dev + smoke.
    orderId = `order_mock_${crypto.randomUUID().slice(0, 10)}`;
  }

  await withPgTx(async (client) => {
    await client.query(
      `INSERT INTO subscriptions
         (id, tenant_id, plan_id, provider, provider_subscription_id, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [subscriptionId, tenantId, planId, provider, orderId]
    );
  });

  return NextResponse.json(
    {
      provider,
      order_id: orderId,
      amount,
      currency,
      plan_id: planId,
      plan_name: String(plan.name),
      subscription_id: subscriptionId,
      mock,
    },
    { status: 201 }
  );
}
