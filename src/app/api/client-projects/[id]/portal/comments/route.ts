import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgMany, pgOne, withPgTx } from "@/lib/pg";
import { resolveAdminTenantId } from "@/lib/theme";

/**
 * Module 8 - admin portal comments. GET lists the thread for a
 * project; POST replies as the studio (author='studio').
 */
export async function GET(
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
  await ensureMigrated();
  const rows = await pgMany<Record<string, unknown>>(
    `SELECT * FROM client_comments
     WHERE client_project_id = $1 AND tenant_id = $2
     ORDER BY created_at ASC`,
    [id, tenantId]
  );
  return NextResponse.json({
    comments: rows.map((r) => ({
      id: String(r.id),
      author: String(r.author ?? "client"),
      message: String(r.message ?? ""),
      createdAt: r.created_at == null ? null : String(r.created_at),
    })),
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const message = String(body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }
  await ensureMigrated();
  const project = await pgOne<{ id: string; tenant_id: number; portal_token: string | null }>(
    `SELECT id, tenant_id, portal_token FROM client_projects WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!project || Number(project.tenant_id) !== tenantId) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  const row = await withPgTx(async (client) => {
    const r = await client.query<Record<string, unknown>>(
      `INSERT INTO client_comments
         (id, tenant_id, client_project_id, portal_token, author, message)
       VALUES ($1, $2, $3, $4, 'studio', $5)
       RETURNING *`,
      [crypto.randomUUID(), tenantId, id, project.portal_token, message]
    );
    return r.rows[0];
  });
  return NextResponse.json({
    comment: {
      id: String(row.id),
      author: String(row.author ?? "studio"),
      message: String(row.message ?? ""),
      createdAt: row.created_at == null ? null : String(row.created_at),
    },
  });
}
