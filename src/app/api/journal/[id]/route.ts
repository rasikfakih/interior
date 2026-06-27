import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ensureMigrated, pgOne, pgQuery } from "@/lib/pg";

async function isAuthorized() {
  const session = await getServerSession(authOptions);
  return Boolean((session?.user as any)?.id);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const d = await req.json();
    const updates: string[] = [];
    const args: unknown[] = [];
    let i = 1;
    if (typeof d.title === "string") {
      updates.push(`title = $${i++}`);
      args.push(d.title.slice(0, 200));
    }
    if (typeof d.slug === "string") {
      updates.push(`slug = $${i++}`);
      args.push(d.slug.slice(0, 200));
    }
    if (typeof d.excerpt === "string") {
      updates.push(`excerpt = $${i++}`);
      args.push(d.excerpt.slice(0, 500));
    }
    if (typeof d.content === "string") {
      updates.push(`content = $${i++}`);
      args.push(d.content.slice(0, 8000));
    }
    if (typeof d.contentJson === "string" || d.contentJson === null) {
      const v = d.contentJson
        ? JSON.stringify(d.contentJson).slice(0, 200000)
        : null;
      updates.push(`content_json = $${i++}::jsonb`);
      args.push(v);
    }
    if (typeof d.coverImage === "string") {
      updates.push(`cover_image = $${i++}`);
      args.push(d.coverImage.slice(0, 500));
    }
    if (typeof d.category === "string") {
      updates.push(`category = $${i++}`);
      args.push(d.category.slice(0, 80));
    }
    if (typeof d.authorName === "string") {
      updates.push(`author_name = $${i++}`);
      args.push(d.authorName.slice(0, 120));
    }
    if (typeof d.isPublished === "boolean") {
      updates.push(`is_published = $${i++}`);
      args.push(d.isPublished);
    }
    if (updates.length === 0) return NextResponse.json({ success: true, noop: true });
    const numericId = Number(id);
    args.push(numericId);
    const q = await pgQuery(
      `UPDATE journal_posts SET ${updates.join(", ")} WHERE id = $${i} RETURNING *`,
      args
    );
    const row = q.rows?.[0];
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, item: row });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await ensureMigrated();
  await pgQuery(
    `DELETE FROM journal_posts WHERE id = $1`,
    [Number(id)]
  );
  return NextResponse.json({ success: true });
}
