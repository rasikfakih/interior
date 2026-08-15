import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, pgOne, withPgTx } from "@/lib/pg";

/**
 * Module 8 - public portal approval. { type: 'board' | 'boq',
 * target_id, comment? } records a client_portal_approvals row and
 * flips the target's status to approved (boards.status or
 * boq_versions.status). Token-authed like the rest of the portal.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  if (!/^[A-Za-z0-9]{8,12}$/.test(token)) {
    return NextResponse.json({ error: "Portal not found." }, { status: 404 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const type = String(body.type ?? "");
  const targetId = String(body.target_id ?? "");
  if (!["board", "boq"].includes(type) || !targetId) {
    return NextResponse.json({ error: "type (board|boq) and target_id are required." }, { status: 400 });
  }
  const comment = body.comment == null || body.comment === ""
    ? null
    : String(body.comment).slice(0, 2000);

  await ensureMigrated();
  const project = await pgOne<{ id: string; tenant_id: number }>(
    `SELECT id, tenant_id FROM client_projects WHERE portal_token = $1 LIMIT 1`,
    [token]
  );
  if (!project) {
    return NextResponse.json({ error: "Portal not found." }, { status: 404 });
  }
  const projectId = String(project.id);
  const tenantId = Number(project.tenant_id);

  let row: Record<string, unknown>;
  try {
    row = await withPgTx(async (client) => {
      // The target must belong to this project + tenant.
      if (type === "board") {
        const t = await client.query<{ id: string }>(
          `SELECT id FROM boards WHERE id = $1 AND client_project_id = $2 AND tenant_id = $3 LIMIT 1`,
          [targetId, projectId, tenantId]
        );
        if (!t.rows[0]) throw new Error("TARGET_NOT_FOUND");
        await client.query(`UPDATE boards SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [targetId]);
      } else {
        const t = await client.query<{ id: string }>(
          `SELECT id FROM boq_versions WHERE id = $1 AND client_project_id = $2 AND tenant_id = $3 LIMIT 1`,
          [targetId, projectId, tenantId]
        );
        if (!t.rows[0]) throw new Error("TARGET_NOT_FOUND");
        await client.query(`UPDATE boq_versions SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [targetId]);
      }
      const r = await client.query<Record<string, unknown>>(
        `INSERT INTO client_portal_approvals
           (id, tenant_id, client_project_id, portal_token, type, target_id, status, comment)
         VALUES ($1, $2, $3, $4, $5, $6, 'approved', $7)
         RETURNING *`,
        [crypto.randomUUID(), tenantId, projectId, token, type, targetId, comment]
      );
      return r.rows[0];
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "TARGET_NOT_FOUND") {
      return NextResponse.json({ error: "Target not found for this project." }, { status: 404 });
    }
    return NextResponse.json({ error: msg || "Approve failed" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    approval: {
      id: String(row.id),
      type: String(row.type),
      targetId: String(row.target_id),
      status: String(row.status),
      comment: row.comment == null ? null : String(row.comment),
      createdAt: row.created_at == null ? null : String(row.created_at),
    },
  });
}
