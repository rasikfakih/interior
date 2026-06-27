import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, withPgTx } from "@/lib/pg";
import { requireLicense } from "@/lib/license-gate";

async function gateOrFail(action: "mutate" | "admin" = "admin") {
  const g = await requireLicense(action);
  if (!g.ok) return NextResponse.json({ error: g.reason }, { status: g.code });
  return null;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const fail = await gateOrFail();
    if (fail) return fail;
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
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "db error" }, { status: 400 });
  }
}
