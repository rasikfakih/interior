import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";

async function isAuthorized() {
  const session = await getServerSession(authOptions);
  return Boolean((session?.user as any)?.id);
}

export async function GET() {
  await ensureMigrated();
  const allProjects = await pgMany(`SELECT * FROM projects ORDER BY id ASC`);
  return NextResponse.json(allProjects);
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const data = await req.json();
    const slug =
      data.slug ||
      (typeof data.title === "string"
        ? data.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-")
        : `project-${Date.now()}`);

    await ensureMigrated();
    const inserted = await pgOne(
      `INSERT INTO projects
         (slug, title, category, location, location_city, year, scope,
          description, description_json, before_image, after_image,
          model_3d, gallery_media_ids, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13::jsonb, $14)
       RETURNING *`,
      [
        slug,
        String(data.title || "Untitled").slice(0, 200),
        String(data.category || "Residential").slice(0, 80),
        data.location ? String(data.location).slice(0, 160) : null,
        data.locationCity ? String(data.locationCity).slice(0, 80) : null,
        data.year ? String(data.year).slice(0, 12) : null,
        data.scope ? String(data.scope).slice(0, 200) : null,
        String(data.description || "").slice(0, 4000),
        data.descriptionJson ? JSON.stringify(data.descriptionJson).slice(0, 200000) : null,
        data.beforeImage ? String(data.beforeImage).slice(0, 500) : null,
        data.afterImage ? String(data.afterImage).slice(0, 500) : null,
        data.model3d ? String(data.model3d).slice(0, 500) : null,
        Array.isArray(data.galleryMediaIds)
          ? JSON.stringify(data.galleryMediaIds)
          : null,
        data.isPublished !== false,
      ]
    );
    return NextResponse.json({ success: true, project: inserted });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Insert failed" },
      { status: 400 }
    );
  }
}
