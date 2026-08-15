import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgOne, withPgTx } from "@/lib/pg";
import { resolveAdminTenantId } from "@/lib/theme";

/**
 * Module 9 - POST /api/social/posts/[id]/publish. Mock publish:
 * flips status to published and stamps published_at. The real
 * Instagram Graph API will land here later via tenants.instagram_token.
 */
export async function POST(
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
  const existing = await pgOne<{ id: string }>(
    `SELECT id FROM social_posts WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [id, tenantId]
  );
  if (!existing) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  await withPgTx(async (client) => {
    await client.query(
      `UPDATE social_posts SET status = 'published', published_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
  });
  return NextResponse.json({ ok: true });
}
