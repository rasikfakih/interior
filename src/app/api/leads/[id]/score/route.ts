import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgOne, withPgTx } from "@/lib/pg";
import { resolveAdminTenantId } from "@/lib/theme";
import { runAiGeneration } from "@/lib/ai-run";

/**
 * Module 9 - POST /api/leads/[id]/score. Runs a lead_score AI
 * generation (records the ledger row, spends one credit) and writes
 * the returned score onto leads.score. Leads are not tenant-scoped
 * (no tenant_id column), so only the admin session gates this.
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const { id } = await ctx.params;
  const leadId = Number(id);
  if (!Number.isFinite(leadId) || leadId <= 0) {
    return NextResponse.json({ error: "Invalid lead id." }, { status: 400 });
  }
  await ensureMigrated();
  const lead = await pgOne<{ id: number }>(
    `SELECT id FROM leads WHERE id = $1 LIMIT 1`,
    [leadId]
  );
  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const result = await runAiGeneration({
    tenantId,
    type: "lead_score",
    clientProjectId: null,
    input: { lead_id: leadId },
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const score = result.generation.output.score;
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return NextResponse.json({ error: "Model did not return a score." }, { status: 502 });
  }
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  await withPgTx(async (client) => {
    await client.query(`UPDATE leads SET score = $1 WHERE id = $2`, [clamped, leadId]);
  });

  return NextResponse.json({
    ok: true,
    score: clamped,
    reason: result.generation.output.reason ?? null,
    generation: result.generation,
    credits: result.credits,
    mock: result.mock,
  });
}
