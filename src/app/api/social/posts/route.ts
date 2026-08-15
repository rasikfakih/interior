import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import { resolveAdminTenantId } from "@/lib/theme";
import { parsePhotos } from "@/lib/site-diary";

/** Module 9 - list social posts for a project (tenant scoped). */
export async function GET(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const projectId = (req.nextUrl.searchParams.get("client_project_id") ?? "").trim();
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
  const rows = await pgMany<Record<string, unknown>>(
    `SELECT * FROM social_posts
     WHERE tenant_id = $1 AND client_project_id = $2
     ORDER BY created_at DESC`,
    [tenantId, projectId]
  );
  return NextResponse.json({
    posts: rows.map((r) => ({
      id: String(r.id),
      tenantId: Number(r.tenant_id),
      clientProjectId: String(r.client_project_id),
      aiGenerationId: r.ai_generation_id == null ? null : String(r.ai_generation_id),
      platform: String(r.platform ?? "instagram"),
      caption: r.caption == null ? null : String(r.caption),
      hashtags: r.hashtags == null ? null : String(r.hashtags),
      imageUrls: parsePhotos(r.image_urls),
      status: String(r.status ?? "draft"),
      scheduledAt: r.scheduled_at == null ? null : String(r.scheduled_at),
      publishedAt: r.published_at == null ? null : String(r.published_at),
      createdAt: r.created_at == null ? null : String(r.created_at),
    })),
  });
}
