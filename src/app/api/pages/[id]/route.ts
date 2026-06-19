import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { requireLicense } from "@/lib/license-gate";

const DB_PATH = path.join(process.cwd(), "data", "etihad.db");

async function gateOrFail(action: "mutate" | "admin" | "read-public" = "admin") {
  const g = await requireLicense(action);
  if (!g.ok) return NextResponse.json({ error: g.reason }, { status: g.code });
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const fail = await gateOrFail("read-public");
  if (fail) return fail;
  const { id } = await params;
  const sqlite = new Database(DB_PATH);
  const page = sqlite.prepare("SELECT * FROM pages WHERE id = ?").get(Number(id));
  const blocks = sqlite
    .prepare("SELECT * FROM page_blocks WHERE page_id = ? ORDER BY order_index ASC, id ASC")
    .all(Number(id));
  sqlite.close();
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ page, blocks });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const fail = await gateOrFail("admin");
  if (fail) return fail;
  try {
    const { id } = await params;
    const d = await req.json();
    const sqlite = new Database(DB_PATH);
    const updates: string[] = [];
    const args: any[] = [];
    if (typeof d.title === "string") {
      updates.push("title = ?");
      args.push(d.title.slice(0, 200));
    }
    if (typeof d.slug === "string") {
      updates.push("slug = ?");
      args.push(d.slug.slice(0, 200));
    }
    if (typeof d.status === "string") {
      updates.push("status = ?");
      args.push(d.status.slice(0, 12));
      if (d.status === "published") {
        updates.push("published_at = ?");
        args.push(new Date().toISOString());
      } else if (d.status === "draft") {
        updates.push("published_at = NULL");
      }
    }
    if (typeof d.seoTitle === "string") {
      updates.push("seo_title = ?");
      args.push(d.seoTitle.slice(0, 200));
    }
    if (typeof d.seoDescription === "string") {
      updates.push("seo_description = ?");
      args.push(d.seoDescription.slice(0, 500));
    }
    if (typeof d.isFront === "boolean") {
      updates.push("is_front = ?");
      args.push(d.isFront ? 1 : 0);
    }
    if (updates.length === 0) {
      sqlite.close();
      return NextResponse.json({ success: true, noop: true });
    }
    args.push(Number(id));
    const r = sqlite
      .prepare(`UPDATE pages SET ${updates.join(", ")} WHERE id = ?`)
      .run(...args);
    sqlite.close();
    if (r.changes === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const fail = await gateOrFail("admin");
  if (fail) return fail;
  const { id } = await params;
  const sqlite = new Database(DB_PATH);
  sqlite.prepare("DELETE FROM page_blocks WHERE page_id = ?").run(Number(id));
  const r = sqlite.prepare("DELETE FROM pages WHERE id = ?").run(Number(id));
  sqlite.close();
  if (r.changes === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
