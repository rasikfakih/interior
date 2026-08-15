import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgMany } from "@/lib/pg";
import { resolveAdminTenantId } from "@/lib/theme";
import { proposalDto, type ProposalDto } from "@/lib/proposals";

/**
 * Admin proposal list, tenant-scoped. Reads ?project_id= to list the
 * proposals for one client engagement (history on the proposal page).
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const projectId = (req.nextUrl.searchParams.get("project_id") ?? "").trim();
  await ensureMigrated();
  const rows = projectId
    ? await pgMany<Record<string, unknown>>(
        `SELECT * FROM proposals
         WHERE tenant_id = $1 AND project_id = $2
         ORDER BY created_at DESC, id DESC`,
        [tenantId, projectId]
      )
    : await pgMany<Record<string, unknown>>(
        `SELECT * FROM proposals
         WHERE tenant_id = $1
         ORDER BY created_at DESC, id DESC`,
        [tenantId]
      );
  const proposals: ProposalDto[] = rows.map((r) => proposalDto(r));
  return NextResponse.json({ proposals });
}
