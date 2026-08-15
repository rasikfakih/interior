import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, pgOne, withPgTx } from "@/lib/pg";

/**
 * Module 8 - public portal comment. The client posts into the
 * project thread as author='client'; the studio replies from the
 * admin page as author='studio'.
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
  const message = String(body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }
  await ensureMigrated();
  const project = await pgOne<{ id: string; tenant_id: number }>(
    `SELECT id, tenant_id FROM client_projects WHERE portal_token = $1 LIMIT 1`,
    [token]
  );
  if (!project) {
    return NextResponse.json({ error: "Portal not found." }, { status: 404 });
  }
  const row = await withPgTx(async (client) => {
    const r = await client.query<Record<string, unknown>>(
      `INSERT INTO client_comments
         (id, tenant_id, client_project_id, portal_token, author, message)
       VALUES ($1, $2, $3, $4, 'client', $5)
       RETURNING *`,
      [crypto.randomUUID(), Number(project.tenant_id), String(project.id), token, message]
    );
    return r.rows[0];
  });
  return NextResponse.json({
    comment: {
      id: String(row.id),
      author: String(row.author ?? "client"),
      message: String(row.message ?? ""),
      createdAt: row.created_at == null ? null : String(row.created_at),
    },
  });
}
