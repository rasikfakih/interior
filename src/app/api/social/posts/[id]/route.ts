import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgOne, withPgTx } from "@/lib/pg";
import { resolveAdminTenantId } from "@/lib/theme";
import { parsePhotos } from "@/lib/site-diary";

const STATUSES = ["draft", "scheduled", "published"];

/**
 * Module 9 - PATCH /api/social/posts/[id] { caption?, hashtags?,
 * status?, scheduled_at? }. Status transitions to scheduled stamp
 * scheduled_at; a manual draft->published flip also stamps
 * published_at (the publish endpoint is the normal path).
 */
export async function PATCH(
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
  await ensureMigrated();
  const existing = await pgOne<{ id: string }>(
    `SELECT id FROM social_posts WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [id, tenantId]
  );
  if (!existing) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const sets: string[] = [];
  const args: unknown[] = [];
  const push = (col: string, val: unknown) => {
    sets.push(`${col} = $${args.length + 1}`);
    args.push(val);
  };

  if (typeof body.caption === "string") push("caption", body.caption);
  if (typeof body.hashtags === "string") push("hashtags", body.hashtags);
  const status = String(body.status ?? "");
  if (status && !STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status (draft|scheduled|published)." }, { status: 400 });
  }
  if (status) push("status", status);
  if (body.scheduled_at != null && body.scheduled_at !== "") {
    push("scheduled_at", String(body.scheduled_at));
  }
  if (status === "published") push("published_at", new Date().toISOString());

  if (sets.length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const row = await withPgTx(async (client) => {
    const r = await client.query<Record<string, unknown>>(
      `UPDATE social_posts SET ${sets.join(", ")} WHERE id = $${args.length + 1} RETURNING *`,
      [...args, id]
    );
    return r.rows[0];
  });

  return NextResponse.json({
    post: {
      id: String(row.id),
      tenantId: Number(row.tenant_id),
      clientProjectId: String(row.client_project_id),
      aiGenerationId: row.ai_generation_id == null ? null : String(row.ai_generation_id),
      platform: String(row.platform ?? "instagram"),
      caption: row.caption == null ? null : String(row.caption),
      hashtags: row.hashtags == null ? null : String(row.hashtags),
      imageUrls: parsePhotos(row.image_urls),
      status: String(row.status ?? "draft"),
      scheduledAt: row.scheduled_at == null ? null : String(row.scheduled_at),
      publishedAt: row.published_at == null ? null : String(row.published_at),
      createdAt: row.created_at == null ? null : String(row.created_at),
    },
  });
}
