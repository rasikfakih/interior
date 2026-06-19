import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { testimonials } from "@/lib/schema";
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
    if (typeof d.name === "string") updates.name = d.name.slice(0, 160);
    if (typeof d.role === "string") updates.role = d.role.slice(0, 160);
    if (typeof d.quote === "string") updates.quote = d.quote.slice(0, 2000);
    if (typeof d.photo === "string") updates.photo = d.photo.slice(0, 500);
    if (typeof d.isPublished === "boolean") updates.isPublished = d.isPublished;
    const updated = await db
      .update(testimonials)
      .set(updates)
      .where(eq(testimonials.id, Number(id)))
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
  await db.delete(testimonials).where(eq(testimonials.id, Number(id)));
  return NextResponse.json({ success: true });
}
