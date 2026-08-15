import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgMany } from "@/lib/pg";

export const dynamic = "force-dynamic";

/** GET /api/billing/plans — active plan catalog, cheapest first. */
export async function GET() {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  await ensureMigrated();
  const rows = await pgMany<Record<string, unknown>>(
    `SELECT id, name, price_usd, price_inr, billing_cycle, project_limit,
            lead_limit, board_limit, boq_version_limit, ai_credits_limit,
            features_json
     FROM plans WHERE is_active = TRUE
     ORDER BY price_usd ASC`
  );
  const plans = rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    priceUsd: Number(r.price_usd ?? 0),
    priceInr: Number(r.price_inr ?? 0),
    billingCycle: String(r.billing_cycle ?? "monthly"),
    projectLimit: Number(r.project_limit ?? 0),
    leadLimit: Number(r.lead_limit ?? 0),
    boardLimit: Number(r.board_limit ?? 0),
    boqVersionLimit: Number(r.boq_version_limit ?? 0),
    aiCreditsLimit: Number(r.ai_credits_limit ?? 0),
    features: r.features_json,
  }));
  return NextResponse.json({ plans });
}
