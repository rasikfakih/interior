import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgMany, pgOne, withPgTx } from "@/lib/pg";
import {
  mapSiteLogRow,
  type SiteLogDto,
} from "@/lib/site-diary";
import { resolveAdminTenantId } from "@/lib/theme";

/**
 * Module 7 - site diary logs.
 *
 * GET ?client_project_id=&from=&to= - logs for one project ordered
 *   log_date desc, created_at desc. Tenant scoped.
 * POST - create a log. tenant_id comes from the project (verified
 *   against the session tenant), created_by from the session email.
 */

function toDto(r: Record<string, unknown>): SiteLogDto {
  return mapSiteLogRow(r);
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
  const from = (sp.get("from") ?? "").trim();
  const to = (sp.get("to") ?? "").trim();
  if (!projectId) {
    return NextResponse.json({ error: "client_project_id is required." }, { status: 400 });
  }
  await ensureMigrated();
  // Tenant check on the project first.
  const project = await pgOne<{ id: string }>(
    `SELECT id FROM client_projects WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [projectId, tenantId]
  );
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  const conds = ["tenant_id = $1", "client_project_id = $2"];
  const args: unknown[] = [tenantId, projectId];
  if (from) {
    conds.push(`log_date >= $${conds.length + 1}`);
    args.push(from);
  }
  if (to) {
    conds.push(`log_date <= $${conds.length + 1}`);
    args.push(to);
  }
  const rows = await pgMany<Record<string, unknown>>(
    `SELECT id, tenant_id, client_project_id, log_date, photos,
            labour_count, work_done, voice_transcript, weather,
            created_by, created_at
     FROM site_logs
     WHERE ${conds.join(" AND ")}
     ORDER BY log_date DESC, created_at DESC`,
    args
  );
  return NextResponse.json({ logs: rows.map(toDto) });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const session = await getServerSession(authOptions);
  const createdBy = session?.user?.email ?? null;
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
  const logDate = body.log_date == null || body.log_date === ""
    ? null
    : String(body.log_date).slice(0, 10);
  const labourCount = Math.max(0, Math.round(Number(body.labour_count ?? 0) || 0));
  const workDone = body.work_done == null ? null : String(body.work_done).slice(0, 8000);
  const voiceTranscript =
    body.voice_transcript == null ? null : String(body.voice_transcript).slice(0, 8000);
  const weather = body.weather == null ? null : String(body.weather).slice(0, 20);
  const photosRaw = Array.isArray(body.photos)
    ? (body.photos as unknown[]).map((p) => String(p)).filter(Boolean)
    : [];
  const photosJson = JSON.stringify(photosRaw);

  try {
    const row = await withPgTx(async (client) => {
      // Verify the project exists and belongs to the tenant.
      const proj = await client.query<{ id: string }>(
        `SELECT id FROM client_projects WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
        [projectId, tenantId]
      );
      if (!proj.rows[0]) {
        throw new Error("PROJECT_NOT_FOUND");
      }
      const id = crypto.randomUUID();
      const r = await client.query<Record<string, unknown>>(
        `INSERT INTO site_logs
           (id, tenant_id, client_project_id, log_date, photos,
            labour_count, work_done, voice_transcript, weather, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, tenant_id, client_project_id, log_date, photos,
                   labour_count, work_done, voice_transcript, weather,
                   created_by, created_at`,
        [
          id,
          tenantId,
          projectId,
          logDate ?? null,
          photosJson,
          labourCount,
          workDone ?? null,
          voiceTranscript ?? null,
          weather ?? null,
          createdBy,
        ]
      );
      return r.rows[0];
    });
    return NextResponse.json({ log: toDto(row) });
  } catch (err) {
    if (err instanceof Error && err.message === "PROJECT_NOT_FOUND") {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Create failed." }, { status: 400 });
  }
}
