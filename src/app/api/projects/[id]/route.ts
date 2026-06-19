import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/schema";
import { eq } from "drizzle-orm";

async function isAuthorized() {
  const session = await getServerSession(authOptions);
  return Boolean((session?.user as any)?.id);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const rows = await db.select().from(projects).where(eq(projects.id, Number(id)));
  if (!rows.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
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
    const data = await req.json();
    const updates: any = {};
    if (typeof data.title === "string") updates.title = data.title.slice(0, 200);
    if (typeof data.category === "string") updates.category = data.category.slice(0, 80);
    if (typeof data.location === "string") updates.location = data.location.slice(0, 160);
    if (typeof data.locationCity === "string") updates.locationCity = data.locationCity.slice(0, 80);
    if (typeof data.year === "string" || data.year === null) updates.year = data.year;
    if (typeof data.scope === "string") updates.scope = data.scope.slice(0, 200);
    if (typeof data.description === "string") updates.description = data.description.slice(0, 4000);
    if (typeof data.descriptionJson === "string" || data.descriptionJson === null) updates.descriptionJson = data.descriptionJson;
    if (typeof data.beforeImage === "string") updates.beforeImage = data.beforeImage.slice(0, 500);
    if (typeof data.afterImage === "string") updates.afterImage = data.afterImage.slice(0, 500);
    if (typeof data.model3d === "string") updates.model3d = data.model3d.slice(0, 500);
    if (Array.isArray(data.galleryMediaIds)) updates.galleryMediaIds = JSON.stringify(data.galleryMediaIds);
    if (typeof data.posterMediaId === "number" || data.posterMediaId === null) updates.posterMediaId = data.posterMediaId;
    if (typeof data.isPublished === "boolean") updates.isPublished = data.isPublished;

    const updated = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, Number(id)))
      .returning();
    if (!updated.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, project: updated[0] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Update failed" },
      { status: 400 }
    );
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
  await db.delete(projects).where(eq(projects.id, Number(id)));
  return NextResponse.json({ success: true });
}
