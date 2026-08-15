import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgMany } from "@/lib/pg";
import {
  mapSiteLogRow,
  mapSnagRow,
  type SiteLogDto,
  type SnagDto,
} from "@/lib/site-diary";
import { resolveAdminTenantId } from "@/lib/theme";

/**
 * Module 7 - weekly report export. GET ?client_project_id=&from=&to=
 * returns { project, from, to, logs, snags, totals } as JSON - the
 * seed payload Module 9's AI weekly report will consume.
 */
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
  const project = await pgMany<Record<string, unknown>>(
    `SELECT id, name, client_name, status
     FROM client_projects WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [projectId, tenantId]
  );
  if (project.length === 0) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  // Snags carry no log_date, so the date range applies to logs only.
  const baseConds = "tenant_id = $1 AND client_project_id = $2";
  const logConds = [baseConds];
  const logArgs: unknown[] = [tenantId, projectId];
  if (from) {
    logConds.push(`log_date >= $${logArgs.length + 1}`);
    logArgs.push(from);
  }
  if (to) {
    logConds.push(`log_date <= $${logArgs.length + 1}`);
    logArgs.push(to);
  }
  const logWhere = logConds.join(" AND ");

  const logRows = await pgMany<Record<string, unknown>>(
    `SELECT id, tenant_id, client_project_id, log_date, photos,
            labour_count, work_done, voice_transcript, weather,
            created_by, created_at
     FROM site_logs WHERE ${logWhere}
     ORDER BY log_date ASC, created_at ASC`,
    logArgs
  );
  const snagRows = await pgMany<Record<string, unknown>>(
    `SELECT id, tenant_id, client_project_id, site_log_id, photo_url,
            description, status, assigned_to, priority, fixed_at,
            verified_at, created_at
     FROM snags WHERE ${baseConds}
     ORDER BY created_at ASC`,
    [tenantId, projectId]
  );
  const logs: SiteLogDto[] = logRows.map(mapSiteLogRow);
  const totalLabour = logs.reduce((sum, l) => sum + (l.labourCount || 0), 0);
  const daysWorked = new Set(logs.map((l) => l.logDate).filter(Boolean)).size;

  const snags: SnagDto[] = snagRows.map(mapSnagRow);
  return NextResponse.json({
    project: project[0],
    range: { from: from || null, to: to || null },
    logs,
    snags,
    totals: {
      logCount: logs.length,
      daysWorked,
      totalLabour,
      photoCount: logs.reduce((sum, l) => sum + l.photos.length, 0),
      snagCount: snags.length,
      openSnags: snags.filter((s) => s.status === "open").length,
    },
  });
}
