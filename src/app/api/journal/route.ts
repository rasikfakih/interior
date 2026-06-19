import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { journalPosts } from "@/lib/schema";

async function isAuthorized() {
  const session = await getServerSession(authOptions);
  return Boolean((session?.user as any)?.id);
}

export async function GET() {
  const rows = await db.select().from(journalPosts);
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
    const inserted = await db
      .insert(journalPosts)
      .values({
        slug,
        title: String(d.title).slice(0, 200),
        excerpt: d.excerpt ? String(d.excerpt).slice(0, 500) : null,
        content: d.content ? String(d.content).slice(0, 8000) : "",
        contentJson: d.contentJson ? String(d.contentJson).slice(0, 200000) : null,
        coverImage: d.coverImage ? String(d.coverImage).slice(0, 500) : null,
        category: d.category ? String(d.category).slice(0, 80) : null,
        authorName: d.authorName ? String(d.authorName).slice(0, 120) : "Studio",
        isPublished: d.isPublished !== false,
      })
      .returning();
    return NextResponse.json({ success: true, item: inserted[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
