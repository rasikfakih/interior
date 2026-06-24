import { NextRequest, NextResponse } from "next/server";
import { openDb } from "@/lib/db";
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
    const sqlite = openDb();
    const tx = sqlite.transaction(() => {
      sqlite.prepare("DELETE FROM page_blocks WHERE page_id = ?").run(pageId);
      const insert = sqlite.prepare(
        `INSERT INTO page_blocks (page_id, type, data, order_index) VALUES (?, ?, ?, ?)`
      );
      blocks.forEach((b: any, i: number) => {
        if (typeof b?.type !== "string") return;
        const data = typeof b.data === "string" ? b.data : JSON.stringify(b.data ?? {});
        insert.run(pageId, b.type, data.slice(0, 200000), i);
      });
    });
    tx();
    sqlite.close();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "db error" }, { status: 400 });
  }
}
