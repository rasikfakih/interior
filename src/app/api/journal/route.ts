import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import { bump } from "@/lib/revalidate";

async function isAuthorized() {
  const session = await getServerSession(authOptions);
  return Boolean((session?.user as any)?.id);
}

export async function GET() {
  await ensureMigrated();
  const rows = await pgMany(
    `SELECT * FROM journal_posts ORDER BY id ASC`
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const d = await req.json();
    if (!d.title) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }
    const slug =
      d.slug || d.title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
    await ensureMigrated();
    const inserted = await pgOne(
      `INSERT INTO journal_posts
         (slug, title, excerpt, content, content_json, cover_image,
          category, author_name, is_published)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
       RETURNING *`,
      [
        slug,
        String(d.title).slice(0, 200),
        d.excerpt ? String(d.excerpt).slice(0, 500) : null,
        d.content ? String(d.content).slice(0, 8000) : "",
        d.contentJson ? JSON.stringify(d.contentJson).slice(0, 200000) : null,
        d.coverImage ? String(d.coverImage).slice(0, 500) : null,
        d.category ? String(d.category).slice(0, 80) : null,
        d.authorName ? String(d.authorName).slice(0, 120) : "Studio",
        d.isPublished !== false,
      ]
    );
    bump({ kind: "journal", slug });
    return NextResponse.json({ success: true, item: inserted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
