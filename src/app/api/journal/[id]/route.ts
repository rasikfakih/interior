import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { journalPosts } from "@/lib/schema";
import { eq } from "drizzle-orm";

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
    const updates: any = {};
    if (typeof d.title === "string") updates.title = d.title.slice(0, 200);
    if (typeof d.slug === "string") updates.slug = d.slug.slice(0, 200);
    if (typeof d.excerpt === "string") updates.excerpt = d.excerpt.slice(0, 500);
    if (typeof d.content === "string") updates.content = d.content.slice(0, 8000);
    if (typeof d.contentJson === "string" || d.contentJson === null)
      updates.contentJson = d.contentJson;
    if (typeof d.coverImage === "string") updates.coverImage = d.coverImage.slice(0, 500);
    if (typeof d.category === "string") updates.category = d.category.slice(0, 80);
    if (typeof d.authorName === "string") updates.authorName = d.authorName.slice(0, 120);
    if (typeof d.isPublished === "boolean") updates.isPublished = d.isPublished;

    const updated = await db
      .update(journalPosts)
      .set(updates)
      .where(eq(journalPosts.id, Number(id)))
      .returning();
    if (!updated.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, item: updated[0] });
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
  await db.delete(journalPosts).where(eq(journalPosts.id, Number(id)));
  return NextResponse.json({ success: true });
}
