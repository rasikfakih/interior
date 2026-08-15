import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgMany, pgOne, withPgTx } from "@/lib/pg";
import { mapSnagRow, SNAG_PRIORITIES, SNAG_STATUSES, type SnagDto } from "@/lib/site-diary";
import { resolveAdminTenantId } from "@/lib/theme";

/**
 * Module 7 - snag list.
 *
 * GET ?client_project_id=&status= - snags for one project, newest
 *   first, with the linked log's log_date joined in for display.
 * POST - create a snag. tenant_id comes from the project (verified
 *   against the session tenant); site_log_id is optional and must
 *   belong to the same project.
 */

function toDto(r: Record<string, unknown>): SnagDto {
  return mapSnagRow(r);
}

export async function GET(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const sp = req.nextUrl.searchParams;
  const projectId = (sp.get("client_project_id") ?? "").trim();
  const status = (sp.get("status") ?? "").trim();
  if (!projectId) {
    return NextResponse.json({ error: "client_project_id is required." }, { status: 400 });
  }
  await ensureMigrated();
  const project = await pgOne<{ id: string }>(
    `SELECT id FROM client_projects WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [projectId, tenantId]
  );
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  const conds = ["s.tenant_id = $1", "s.client_project_id = $2"];
  const args: unknown[] = [tenantId, projectId];
  if (status && (SNAG_STATUSES as readonly string[]).includes(status)) {
    conds.push(`s.status = $${conds.length + 1}`);
    args.push(status);
  }
  const rows = await pgMany<Record<string, unknown>>(
    `SELECT s.id, s.tenant_id, s.client_project_id, s.site_log_id,
            s.photo_url, s.description, s.status, s.assigned_to,
            s.priority, s.fixed_at, s.verified_at, s.created_at,
            sl.log_date
     FROM snags s
     LEFT JOIN site_logs sl ON sl.id = s.site_log_id
     WHERE ${conds.join(" AND ")}
     ORDER BY s.created_at DESC`,
    args
  );
  return NextResponse.json({ snags: rows.map(toDto) });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const projectId = String(body.client_project_id ?? "").trim();
  if (!projectId) {
    return NextResponse.json({ error: "client_project_id is required." }, { status: 400 });
  }
  const description = String(body.description ?? "").trim();
  if (!description) {
    return NextResponse.json({ error: "description is required." }, { status: 400 });
  }
  const siteLogId = body.site_log_id == null || body.site_log_id === ""
    ? null
    : String(body.site_log_id);
  const photoUrl = body.photo_url == null || body.photo_url === ""
    ? null
    : String(body.photo_url).slice(0, 2000);
  const assignedTo = body.assigned_to == null || body.assigned_to === ""
    ? null
    : String(body.assigned_to).slice(0, 200);
  const priority = (SNAG_PRIORITIES as readonly string[]).includes(String(body.priority ?? ""))
    ? String(body.priority)
    : "medium";

  try {
    const row = await withPgTx(async (client) => {
      const proj = await client.query<{ id: string }>(
        `SELECT id FROM client_projects WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
        [projectId, tenantId]
      );
      if (!proj.rows[0]) {
        throw new Error("PROJECT_NOT_FOUND");
      }
      if (siteLogId) {
        const log = await client.query<{ id: string }>(
          `SELECT id FROM site_logs WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
          [siteLogId, tenantId]
        );
        if (!log.rows[0]) {
          throw new Error("LOG_NOT_FOUND");
        }
      }
      const id = crypto.randomUUID();
      const r = await client.query<Record<string, unknown>>(
        `INSERT INTO snags
           (id, tenant_id, client_project_id, site_log_id, photo_url,
            description, status, assigned_to, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, tenant_id, client_project_id, site_log_id,
                   photo_url, description, status, assigned_to,
                   priority, fixed_at, verified_at, created_at`,
        [id, tenantId, projectId, siteLogId, photoUrl, description, "open", assignedTo, priority]
      );
      return r.rows[0];
    });
    return NextResponse.json({ snag: toDto(row) });
  } catch (err) {
    if (err instanceof Error && err.message === "PROJECT_NOT_FOUND") {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    if (err instanceof Error && err.message === "LOG_NOT_FOUND") {
      return NextResponse.json({ error: "Linked log not found." }, { status: 404 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Create failed." }, { status: 400 });
  }
}
