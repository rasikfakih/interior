import { NextRequest, NextResponse } from "next/server";
import { requireLicense, requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgMany, pgQuery } from "@/lib/pg";

async function gateOrFail(action: "mutate" | "admin" | "read-public" = "read-public") {
  const g = await requireLicense(action);
  if (!g.ok) return NextResponse.json({ error: g.reason }, { status: g.code });
  return null;
}

const PAGE_COLUMNS = `id, slug, title, status, is_front, seo_title, seo_description, published_at`;

export async function GET() {
  try {
    const fail = await gateOrFail("read-public");
    if (fail) return fail;
    await ensureMigrated();
    const rows = await pgMany(
      `SELECT ${PAGE_COLUMNS} FROM pages ORDER BY id ASC`
    );
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "db error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const failSong = await requireAdminSession();
    if (!failSong.ok) return failSong.response;
    const d = await req.json();
    if (!d.slug || !d.title) {
      return NextResponse.json({ error: "slug and title required" }, { status: 400 });
    }
    await ensureMigrated();
    const exists = await pgQuery(
      `SELECT id FROM pages WHERE slug = $1 LIMIT 1`,
      [String(d.slug).slice(0, 200)]
    );
    if (exists.rowCount && exists.rowCount > 0) {
      return NextResponse.json({ error: "slug already used" }, { status: 400 });
    }
    const r = await pgQuery<{ id: number }>(
      `INSERT INTO pages
         (slug, title, status, seo_title, seo_description, is_front, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        String(d.slug).slice(0, 200),
        String(d.title).slice(0, 200),
        String(d.status || "draft").slice(0, 12),
        d.seoTitle ? String(d.seoTitle).slice(0, 200) : null,
        d.seoDescription ? String(d.seoDescription).slice(0, 500) : null,
        Boolean(d.isFront),
        d.status === "published" ? new Date().toISOString() : null,
      ]
    );
    const id = r.rows?.[0]?.id ?? null;
    return NextResponse.json({ success: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
