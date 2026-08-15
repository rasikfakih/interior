import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgMany, pgOne, withPgTx } from "@/lib/pg";
import { resolveAdminTenantId } from "@/lib/theme";
import { checkPlan, planBlockedBody } from "@/lib/billing";
import { clientProjectDto, type ClientProjectDto } from "@/lib/proposals";

/**
 * Client engagements (Module 3). POST creates a project from a lead
 * (closing Lead -> Project), GET lists tenant-scoped projects with
 * search. Both gated by requireAdminSession like the other StudioOS
 * admin surfaces. The tenant comes from resolveAdminTenantId()
 * (domain -> slug -> first tenant), the same resolution the admin
 * console edits.
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
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }

  const name = String(body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  const leadIdRaw = body?.lead_id;
  const leadId = leadIdRaw == null || leadIdRaw === "" ? null : Number(leadIdRaw);
  if (leadId != null && (!Number.isFinite(leadId) || leadId <= 0)) {
    return NextResponse.json({ error: "Invalid lead_id." }, { status: 400 });
  }
  const num = (v: unknown): number | null => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  await ensureMigrated();
  // Module 10: plan gate on the projects limit.
  const gateRes = await checkPlan(tenantId, "projects");
  if (!gateRes.allowed) {
    return NextResponse.json(planBlockedBody(gateRes), { status: gateRes.status });
  }
  try {
    const projectId = crypto.randomUUID();
    await withPgTx(async (client) => {
      await client.query(
        `INSERT INTO client_projects
           (id, tenant_id, lead_id, name, client_name, client_phone,
            client_email, budget, area_sqft, address, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft')`,
        [
          projectId,
          tenantId,
          leadId,
          name,
          String(body?.client_name ?? "").trim() || null,
          String(body?.client_phone ?? "").trim() || null,
          String(body?.client_email ?? "").trim() || null,
          num(body?.budget),
          num(body?.area_sqft),
          String(body?.address ?? "").trim() || null,
        ]
      );
      // Lead -> Project: the engagement opens, so the lead advances to
      // qualified. Terminal states (won / lost) are not regressed.
      if (leadId != null) {
        await client.query(
          `UPDATE leads SET status = 'qualified', last_status_change_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND status NOT IN ('won', 'lost')`,
          [leadId]
        );
      }
    });
    const row = await pgOneRow(projectId);
    return NextResponse.json({ project: row });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Create failed" }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  await ensureMigrated();
  // One distinct $N per occurrence: the SQLite fallback shim rewrites
  // each $N to its own `?`, so a reused placeholder binds too few
  // values. The search clause is skipped entirely when q is empty.
  const rows = q
    ? await pgMany<Record<string, unknown>>(
        `SELECT cp.*, l.name AS lead_name
         FROM client_projects cp
         LEFT JOIN leads l ON l.id = cp.lead_id
         WHERE cp.tenant_id = $1
           AND (
             cp.name LIKE '%' || $2 || '%'
             OR COALESCE(cp.client_name, '') LIKE '%' || $3 || '%'
             OR COALESCE(cp.client_email, '') LIKE '%' || $4 || '%'
             OR COALESCE(cp.client_phone, '') LIKE '%' || $5 || '%'
             OR COALESCE(l.name, '') LIKE '%' || $6 || '%'
           )
         ORDER BY cp.created_at DESC, cp.id DESC`,
        [tenantId, q, q, q, q, q]
      )
    : await pgMany<Record<string, unknown>>(
        `SELECT cp.*, l.name AS lead_name
         FROM client_projects cp
         LEFT JOIN leads l ON l.id = cp.lead_id
         WHERE cp.tenant_id = $1
         ORDER BY cp.created_at DESC, cp.id DESC`,
        [tenantId]
      );
  const projects: ClientProjectDto[] = rows.map((r) => clientProjectDto(r));
  return NextResponse.json({ projects });
}

async function pgOneRow(id: string): Promise<ClientProjectDto | null> {
  const row = await pgOne<Record<string, unknown>>(
    `SELECT cp.*, l.name AS lead_name
     FROM client_projects cp
     LEFT JOIN leads l ON l.id = cp.lead_id
     WHERE cp.id = $1 LIMIT 1`,
    [id]
  );
  return row ? clientProjectDto(row) : null;
}
