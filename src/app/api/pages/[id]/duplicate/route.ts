import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { appendAudit } from "@/lib/license";
import { ensureMigrated, pgMany, pgOne, withPgTx } from "@/lib/pg";
import { bump } from "@/lib/revalidate";
import { snapshotPage } from "@/lib/revisions";

/**
 * POST /api/pages/[id]/duplicate - copy a page (meta + blocks) into a
 * new draft under a unique "slug-copy" slug (StudioOS Phase 1).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return new NextResponse(gate.response.body, gate.response);
  }
  const { id } = await params;
  const sourceId = Number(id);
  if (!Number.isFinite(sourceId) || sourceId <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  await ensureMigrated();
  const source = await pgOne<{
    id: number;
    slug: string;
    title: string;
    seo_title: string | null;
    seo_description: string | null;
    og_media_id: number | null;
    robots: string | null;
  }>(
    `SELECT id, slug, title, seo_title, seo_description, og_media_id, robots
     FROM pages WHERE id = $1 LIMIT 1`,
    [sourceId]
  );
  if (!source) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const blocks = await pgMany<{ type: string; data: unknown }>(
    `SELECT type, data FROM page_blocks
     WHERE page_id = $1 ORDER BY order_index ASC, id ASC`,
    [sourceId]
  );

  // Unique slug: slug-copy, slug-copy-2, ...
  let candidate = `${source.slug}-copy`;
  let suffix = 2;
  for (;;) {
    const clash = await pgOne<{ id: number }>(
      `SELECT id FROM pages WHERE slug = $1 LIMIT 1`,
      [candidate]
    );
    if (!clash) break;
    candidate = `${source.slug}-copy-${suffix}`;
    suffix += 1;
  }
  const finalSlug = candidate;

  const newId = await withPgTx(async (client) => {
    const r = await client.query<{ id: number }>(
      `INSERT INTO pages
         (slug, title, status, seo_title, seo_description, og_media_id, robots, is_front)
       VALUES ($1, $2, 'draft', $3, $4, $5, $6, FALSE)
       RETURNING id`,
      [
        finalSlug,
        `${source.title} (copy)`,
        source.seo_title,
        source.seo_description,
        source.og_media_id,
        source.robots,
      ]
    );
    const pid = r.rows[0]?.id;
    if (pid == null) throw new Error("insert failed");
    const insert =
      "INSERT INTO page_blocks (page_id, type, data, order_index) VALUES ($1, $2, $3::jsonb, $4)";
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (!b || typeof b.type !== "string") continue;
      await client.query(insert, [
        pid,
        b.type,
        JSON.stringify(typeof b.data === "string" ? safeJson(b.data) : b.data ?? {}),
        i,
      ]);
    }
    return pid;
  });

  await snapshotPage(newId);
  await appendAudit("pages.duplicate", `pages#${sourceId} duplicated -> pages#${newId}`, {
    sourceId,
    newId,
    role: gate.role,
  });
  bump({ kind: "pages" });

  return NextResponse.json({ success: true, id: newId, slug: finalSlug });
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
