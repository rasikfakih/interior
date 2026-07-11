import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, pgQuery, withPgTx } from "@/lib/pg";
import { requireAdminSession } from "@/lib/license-gate";
import { appendAudit } from "@/lib/license";
import { bump } from "@/lib/revalidate";

/**
 * Single-roundtrip save endpoint for /admin/pages/[id].
 *
 * Body shape:
 *   {
 *     meta:   { title?, slug?, status?, seoTitle?, seoDescription?, isFront? },
 *     blocks: Array<{ type: string, data: any }>
 *   }
 *
 * The body is optional - either meta or blocks can be the only
 * thing in flight; both get applied when present. On success:
 *   { success: true, saved: { meta: boolean, blocks: number }, audit: { kind, message } }
 *
 * The blocks PUT inside the same transaction as the meta
 * UPDATE so a partial-save can never land a new block array
 * plus an old title.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const failSong = await requireAdminSession();
    if (!failSong.ok) return failSong.response;
    const { id } = await params;
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const meta: Record<string, unknown> =
      body && typeof body.meta === "object" && body.meta !== null
        ? (body.meta as Record<string, unknown>)
        : {};
    const blocksIn: unknown = body && Array.isArray(body.blocks) ? body.blocks : [];

    await ensureMigrated();

    let metaSaved = false;
    let blocksSaved = 0;
    let auditMessage: string | null = null;
    let auditKind: string | null = null;

    await withPgTx(async (client) => {
      if (Object.keys(meta).length > 0) {
        const setClauses: string[] = [];
        const args: unknown[] = [];
        let i = 1;
        if (typeof meta.title === "string") {
          setClauses.push(`title = $${i++}`);
          args.push(String(meta.title).slice(0, 200));
        }
        if (typeof meta.slug === "string") {
          setClauses.push(`slug = $${i++}`);
          args.push(String(meta.slug).slice(0, 200));
        }
        if (typeof meta.status === "string") {
          const s = String(meta.status).slice(0, 12);
          setClauses.push(`status = $${i++}`);
          args.push(s);
          if (s === "published") {
            setClauses.push(`published_at = $${i++}`);
            args.push(new Date().toISOString());
          } else if (s === "draft") {
            setClauses.push(`published_at = NULL`);
          }
        }
        if (typeof meta.seoTitle === "string") {
          setClauses.push(`seo_title = $${i++}`);
          args.push(String(meta.seoTitle).slice(0, 200));
        }
        if (typeof meta.seoDescription === "string") {
          setClauses.push(`seo_description = $${i++}`);
          args.push(String(meta.seoDescription).slice(0, 500));
        }
        if (typeof meta.isFront === "boolean") {
          setClauses.push(`is_front = $${i++}`);
          args.push(Boolean(meta.isFront));
        }
        if (setClauses.length > 0) {
          args.push(numericId);
          const r = await client.query(
            `UPDATE pages SET ${setClauses.join(", ")} WHERE id = $${i}`,
            args
          );
          if (!r.rowCount) {
            throw new Error("page not found");
          }
          metaSaved = true;
        }
      }

      if (Array.isArray(blocksIn) && blocksIn.length >= 0) {
        await client.query(`DELETE FROM page_blocks WHERE page_id = $1`, [
          numericId,
        ]);
        const insert =
          "INSERT INTO page_blocks (page_id, type, data, order_index) VALUES ($1, $2, $3::jsonb, $4)";
        for (let i = 0; i < (blocksIn as unknown[]).length; i++) {
          const b: any = (blocksIn as any[])[i];
          if (typeof b?.type !== "string") continue;
          const data =
            typeof b.data === "string"
              ? b.data
              : JSON.stringify(b.data ?? {});
          await client.query(insert, [
            numericId,
            b.type,
            data.slice(0, 200000),
            i,
          ]);
          blocksSaved += 1;
        }
      }
    });

    if (metaSaved || blocksSaved > 0) {
      const kind = "pages.save";
      const message = `pages#${numericId} save: meta=${metaSaved ? "1" : "0"} blocks=${blocksSaved}`;
      auditKind = kind;
      auditMessage = message;
      await appendAudit(kind, message, {
        pageId: numericId,
        role: failSong.role,
        metaFields: Object.keys(meta),
        blocksCount: blocksSaved,
      });
    }

    try {
      const { pgOne } = await import("@/lib/pg");
      const pageRow = await pgOne<{ slug: string }>(
        `SELECT slug FROM pages WHERE id = $1`,
        [numericId]
      );
      bump({ kind: "pages", pageSlug: pageRow?.slug, slug: pageRow?.slug });
    } catch {
      bump({ kind: "pages" });
    }

    return NextResponse.json({
      success: true,
      saved: { meta: metaSaved, blocks: blocksSaved },
      audit: auditKind
        ? { kind: auditKind, message: auditMessage }
        : null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "db error" },
      { status: 400 }
    );
  }
}
