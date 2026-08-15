import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { resolveAdminTenantId } from "@/lib/theme";
import { checkPlan, planBlockedBody } from "@/lib/billing";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import {
  DEFAULT_CANVAS,
  mapBoard,
  type BoardDto,
} from "@/lib/boards";

export const dynamic = "force-dynamic";

/**
 * GET /api/boards?client_project_id=&q=
 *   Lists boards for a client engagement with an item count, newest
 *   first. Tenant-scoped via the admin session.
 * POST /api/boards {client_project_id, title?}
 *   Creates a board for the engagement (tenant from session, but the
 *   engagement itself must belong to that tenant).
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenantId = await resolveAdminTenantId();

  const clientProjectId = req.nextUrl.searchParams.get("client_project_id");
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();

  if (!clientProjectId) {
    return NextResponse.json(
      { error: "client_project_id is required" },
      { status: 400 }
    );
  }

  await ensureMigrated();
  // Distinct params per occurrence: the SQLite shim expands each $N to
  // its own `?`, so a reused $N would leave too few bound values.
  const rows = await pgMany<Record<string, unknown>>(
    `SELECT b.*, COUNT(bi.id) AS items_count
     FROM boards b
     LEFT JOIN board_items bi ON bi.board_id = b.id
     WHERE b.tenant_id = $1 AND b.client_project_id = $2
       AND ($3 = '' OR b.title LIKE '%' || $4 || '%')
     GROUP BY b.id
     ORDER BY b.created_at DESC`,
    [tenantId, clientProjectId, q, q]
  );
  return NextResponse.json({ boards: rows.map((r) => mapBoard(r)) });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenantId = await resolveAdminTenantId();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const clientProjectId = String(body.client_project_id ?? "").trim();
  if (!clientProjectId) {
    return NextResponse.json({ error: "client_project_id is required" }, { status: 400 });
  }
  const title = String(body.title ?? "").trim() || "Moodboard";

  await ensureMigrated();
  const project = await pgOne<{ tenant_id: number }>(
    `SELECT tenant_id FROM client_projects WHERE id = $1 LIMIT 1`,
    [clientProjectId]
  );
  if (!project) {
    return NextResponse.json({ error: "project not found" }, { status: 404 });
  }
  if (project.tenant_id !== tenantId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Module 10: plan gate on the boards-per-tenant limit.
  const gateRes = await checkPlan(tenantId, "boards");
  if (!gateRes.allowed) {
    return NextResponse.json(planBlockedBody(gateRes), { status: gateRes.status });
  }

  const id = crypto.randomUUID();
  await pgMany(
    `INSERT INTO boards (id, tenant_id, client_project_id, title, canvas_json)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, tenantId, clientProjectId, title, JSON.stringify(DEFAULT_CANVAS)]
  );
  const row = await pgOne<Record<string, unknown>>(
    `SELECT * FROM boards WHERE id = $1 LIMIT 1`,
    [id]
  );
  const board: BoardDto | null = row ? mapBoard(row) : null;
  return NextResponse.json({ board }, { status: 201 });
}
