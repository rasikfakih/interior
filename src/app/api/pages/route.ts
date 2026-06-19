import { NextRequest, NextResponse } from "next/server";
import { requireLicense } from "@/lib/license-gate";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "etihad.db");

function openDb() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  return sqlite;
}

async function gateOrFail(action: "mutate" | "admin" | "read-public" = "admin") {
  const g = await requireLicense(action);
  if (!g.ok) return NextResponse.json({ error: g.reason }, { status: g.code });
  return null;
}

export async function GET() {
  const fail = await gateOrFail("read-public");
  if (fail) return fail;
  const sqlite = openDb();
  const rows = sqlite
    .prepare(
      `SELECT id, slug, title, status, is_front, seo_title, seo_description, published_at FROM pages ORDER BY id ASC`
    )
    .all();
  sqlite.close();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const fail = await gateOrFail("admin");
  if (fail) return fail;
  try {
    const d = await req.json();
    if (!d.slug || !d.title) {
      return NextResponse.json({ error: "slug and title required" }, { status: 400 });
    }
    const sqlite = openDb();
    const exists = sqlite.prepare("SELECT id FROM pages WHERE slug = ?").get(d.slug);
    if (exists) {
      sqlite.close();
      return NextResponse.json({ error: "slug already used" }, { status: 400 });
    }
    const r = sqlite
      .prepare(
        `INSERT INTO pages (slug, title, status, seo_title, seo_description, is_front, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        String(d.slug).slice(0, 200),
        String(d.title).slice(0, 200),
        String(d.status || "draft").slice(0, 12),
        d.seoTitle ? String(d.seoTitle).slice(0, 200) : null,
        d.seoDescription ? String(d.seoDescription).slice(0, 500) : null,
        Boolean(d.isFront),
        d.status === "published" ? new Date().toISOString() : null
      );
    const id = Number(r.lastInsertRowid);
    sqlite.close();
    return NextResponse.json({ success: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
