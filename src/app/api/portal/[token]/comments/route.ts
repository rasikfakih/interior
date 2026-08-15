import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";

/**
 * Module 8 - public portal comments list. The client-side portal
 * polls this for the thread (the main GET already carries comments;
 * this endpoint keeps the tab fresh without re-reading everything).
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  if (!/^[A-Za-z0-9]{8,12}$/.test(token)) {
    return NextResponse.json({ error: "Portal not found." }, { status: 404 });
  }
  await ensureMigrated();
  const project = await pgOne<{ id: string }>(
    `SELECT id FROM client_projects WHERE portal_token = $1 LIMIT 1`,
    [token]
  );
  if (!project) {
    return NextResponse.json({ error: "Portal not found." }, { status: 404 });
  }
  const rows = await pgMany<Record<string, unknown>>(
    `SELECT * FROM client_comments
     WHERE client_project_id = $1 AND portal_token = $2
     ORDER BY created_at ASC`,
    [String(project.id), token]
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
