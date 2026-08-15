import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgMany } from "@/lib/pg";
import { resolveAdminTenantId } from "@/lib/theme";
import { getTenantAiCredits } from "@/lib/ai";
import { mapGenerationRow } from "@/lib/ai-run";

/**
 * Module 9 - GET /api/ai/generations?client_project_id=&type= lists
 * the tenant's generation ledger (project filter optional) plus the
 * live credit meter for the usage page.
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  await ensureMigrated();
  const sp = req.nextUrl.searchParams;
  const projectId = (sp.get("client_project_id") ?? "").trim();
  const type = (sp.get("type") ?? "").trim();

  const conds = ["tenant_id = $1"];
  const args: unknown[] = [tenantId];
  if (projectId) {
    conds.push(`client_project_id = $${args.length + 1}`);
    args.push(projectId);
  }
  if (type) {
    conds.push(`type = $${args.length + 1}`);
    args.push(type);
  }
  const rows = await pgMany<Record<string, unknown>>(
    `SELECT * FROM ai_generations WHERE ${conds.join(" AND ")}
     ORDER BY created_at DESC LIMIT 100`,
    args
  );
  const credits = await getTenantAiCredits(tenantId);
  return NextResponse.json({
    generations: rows.map(mapGenerationRow),
    credits,
  });
}
