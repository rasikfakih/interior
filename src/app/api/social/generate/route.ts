import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgMany, pgOne, withPgTx } from "@/lib/pg";
import { resolveAdminTenantId } from "@/lib/theme";
import { runAiGeneration } from "@/lib/ai-run";
import { type AiOutput } from "@/lib/ai";
import { parseJsonCell } from "@/lib/json-cell";
import { parsePhotos } from "@/lib/site-diary";

/**
 * Module 9 - POST /api/social/generate { client_project_id,
 * ai_generation_id?, photo_urls? }. Runs (or reuses) a social_caption
 * generation and creates a draft social_posts row: caption from the
 * first English caption, hashtags joined, image_urls from the
 * selection (falls back to board thumbnails then diary photos).
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
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
  await ensureMigrated();
  const project = await pgOne<{ id: string }>(
    `SELECT id FROM client_projects WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [projectId, tenantId]
  );
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const photoUrls = Array.isArray(body.photo_urls)
    ? body.photo_urls.map((u) => String(u)).filter(Boolean)
    : [];

  let generationId: string | null =
    body.ai_generation_id == null || body.ai_generation_id === ""
      ? null
      : String(body.ai_generation_id);
  let output: AiOutput | null = null;

  if (generationId) {
    // Reuse an existing social_caption generation for this project.
    const gen = await pgOne<{ id: string; output_json: unknown }>(
      `SELECT id, output_json FROM ai_generations
       WHERE id = $1 AND tenant_id = $2 AND client_project_id = $3 AND type = 'social_caption' LIMIT 1`,
      [generationId, tenantId, projectId]
    );
    if (!gen) {
      return NextResponse.json({ error: "Generation not found for this project." }, { status: 404 });
    }
    generationId = String(gen.id);
    output = parseJsonCell<AiOutput>(gen.output_json, {
      text: typeof gen.output_json === "string" ? gen.output_json : "",
    });
  } else {
    const result = await runAiGeneration({
      tenantId,
      type: "social_caption",
      clientProjectId: projectId,
      input: { photo_urls: photoUrls },
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    generationId = result.generation.id;
    output = result.generation.output;
  }

  if (!output) {
    return NextResponse.json({ error: "No caption output." }, { status: 400 });
  }

  // Fallback image set: board thumbnails, then diary photos.
  let images = photoUrls;
  if (images.length === 0) {
    const boardRows = await pgMany<Record<string, unknown>>(
      `SELECT id FROM boards WHERE client_project_id = $1 AND tenant_id = $2 ORDER BY updated_at DESC LIMIT 3`,
      [projectId, tenantId]
    );
    for (const br of boardRows) {
      const imgs = await pgMany<{ image_url: string | null }>(
        `SELECT m.image_url AS image_url
         FROM board_items bi
         JOIN materials m ON m.id = bi.material_id
         WHERE bi.board_id = $1 AND m.image_url IS NOT NULL
         ORDER BY bi.z_index ASC LIMIT 4`,
        [String(br.id)]
      );
      images.push(...imgs.map((r) => String(r.image_url)).filter(Boolean));
    }
  }
  if (images.length === 0) {
    const logRows = await pgMany<{ photos: unknown }>(
      `SELECT photos FROM site_logs WHERE client_project_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 3`,
      [projectId, tenantId]
    );
    for (const lr of logRows) {
      images.push(...parsePhotos(lr.photos));
    }
  }
  images = [...new Set(images)].slice(0, 10);

  const caption = output.captions?.[0] || output.text || "New project update";
  const hashtags = Array.isArray(output.hashtags)
    ? output.hashtags.join(" ")
    : "#interiordesignindia #homedesign";

  const row = await withPgTx(async (client) => {
    const r = await client.query<Record<string, unknown>>(
      `INSERT INTO social_posts
         (id, tenant_id, client_project_id, ai_generation_id, platform, caption, hashtags, image_urls, status)
       VALUES ($1, $2, $3, $4, 'instagram', $5, $6, $7, 'draft')
       RETURNING *`,
      [crypto.randomUUID(), tenantId, projectId, generationId, caption, hashtags, JSON.stringify(images)]
    );
    return r.rows[0];
  });

  return NextResponse.json(
    {
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
      output,
    },
    { status: 201 }
  );
}
