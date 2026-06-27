import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ensureMigrated, pgOne, pgQuery } from "@/lib/pg";

async function isAuthorized() {
  const session = await getServerSession(authOptions);
  return Boolean((session?.user as any)?.id);
}

const COLUMN_MAP: Record<string, string> = {
  title: "title",
  category: "category",
  location: "location",
  locationCity: "location_city",
  year: "year",
  scope: "scope",
  description: "description",
  descriptionJson: "description_json",
  beforeImage: "before_image",
  afterImage: "after_image",
  model3d: "model_3d",
  galleryMediaIds: "gallery_media_ids",
  posterMediaId: "poster_media_id",
  isPublished: "is_published",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await ensureMigrated();
  const row = await pgOne(`SELECT * FROM projects WHERE id = $1`, [Number(id)]);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(row);
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
    const updates: string[] = [];
    const args: unknown[] = [];
    let i = 1;
    const push = (cli: string, sql: string, value: unknown) => {
      updates.push(`${sql} = $${i++}`);
      args.push(value);
      void cli;
    };
    if (typeof data.title === "string") push("title", "title", data.title.slice(0, 200));
    if (typeof data.category === "string") push("category", "category", data.category.slice(0, 80));
    if (typeof data.location === "string") push("location", "location", data.location.slice(0, 160));
    if (typeof data.locationCity === "string") push("locationCity", "location_city", data.locationCity.slice(0, 80));
    if (typeof data.year === "string" || data.year === null) push("year", "year", data.year);
    if (typeof data.scope === "string") push("scope", "scope", data.scope.slice(0, 200));
    if (typeof data.description === "string") push("description", "description", data.description.slice(0, 4000));
    if (typeof data.descriptionJson === "string" || data.descriptionJson === null) {
      updates.push(`description_json = $${i++}::jsonb`);
      args.push(data.descriptionJson ? JSON.stringify(data.descriptionJson).slice(0, 200000) : null);
    }
    if (typeof data.beforeImage === "string") push("beforeImage", "before_image", data.beforeImage.slice(0, 500));
    if (typeof data.afterImage === "string") push("afterImage", "after_image", data.afterImage.slice(0, 500));
    if (typeof data.model3d === "string") push("model3d", "model_3d", data.model3d.slice(0, 500));
    if (Array.isArray(data.galleryMediaIds)) {
      updates.push(`gallery_media_ids = $${i++}::jsonb`);
      args.push(JSON.stringify(data.galleryMediaIds));
    }
    if (typeof data.posterMediaId === "number" || data.posterMediaId === null) push("posterMediaId", "poster_media_id", data.posterMediaId);
    if (typeof data.isPublished === "boolean") push("isPublished", "is_published", data.isPublished);

    if (updates.length === 0) {
      return NextResponse.json({ success: true, noop: true });
    }
    const numericId = Number(id);
    args.push(numericId);
    const q = await pgQuery(
      `UPDATE projects SET ${updates.join(", ")} WHERE id = $${i} RETURNING *`,
      args
    );
    const row = q.rows?.[0];
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, project: row });
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
  await ensureMigrated();
  await pgQuery(`DELETE FROM projects WHERE id = $1`, [Number(id)]);
  return NextResponse.json({ success: true });
}

// COLUMN_MAP unused at runtime but kept here so an operator
// adding a new update path has the surface to mirror.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _kept = COLUMN_MAP;
