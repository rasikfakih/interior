import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, withPgTx } from "@/lib/pg";
import { requireAdminSession } from "@/lib/license-gate";
import { bump } from "@/lib/revalidate";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const failSong = await requireAdminSession();
    if (!failSong.ok) return failSong.response;
    const { id } = await params;
    const pageId = Number(id);
    await ensureMigrated();
    const { pgMany } = await import("@/lib/pg");
    const rows = await pgMany(
      `SELECT id, page_id, type, data, order_index
         FROM page_blocks
        WHERE page_id = $1
        ORDER BY order_index ASC, id ASC`,
      [pageId]
    );
    return NextResponse.json({ blocks: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "db error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const failSong = await requireAdminSession();
    if (!failSong.ok) return failSong.response;
    const { id } = await params;
    const pageId = Number(id);
    const d = await req.json();
    const blocks = Array.isArray(d.blocks) ? d.blocks : [];

    await ensureMigrated();
    await withPgTx(async (client) => {
      await client.query(`DELETE FROM page_blocks WHERE page_id = $1`, [pageId]);
      const insert =
        "INSERT INTO page_blocks (page_id, type, data, order_index) VALUES ($1, $2, $3::jsonb, $4)";
      for (let i = 0; i < blocks.length; i++) {
        const b: any = blocks[i];
        if (typeof b?.type !== "string") continue;
        const data =
          typeof b.data === "string" ? b.data : JSON.stringify(b.data ?? {});
        await client.query(insert, [
          pageId,
          b.type,
          data.slice(0, 200000),
          i,
        ]);
      }
    });
    try {
      const { pgOne } = await import("@/lib/pg");
      const pageRow = await pgOne<{ slug: string }>(
        `SELECT slug FROM pages WHERE id = $1`,
        [pageId]
      );
      bump({ kind: "pages", pageSlug: pageRow?.slug, slug: pageRow?.slug });
    } catch {
      bump({ kind: "pages" });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "db error" }, { status: 400 });
  }
}
