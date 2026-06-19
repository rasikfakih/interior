import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { requireLicense } from "@/lib/license-gate";

const DB_PATH = path.join(process.cwd(), "data", "etihad.db");

function openDb() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  return sqlite;
}

async function gateOrFail(action: "mutate" | "admin" = "admin") {
  const g = await requireLicense(action);
  if (!g.ok) return NextResponse.json({ error: g.reason }, { status: g.code });
  return null;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const fail = await gateOrFail();
  if (fail) return fail;
  const { id } = await params;
  const pageId = Number(id);
  try {
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
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
