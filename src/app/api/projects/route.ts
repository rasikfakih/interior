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

export async function GET() {
  const allProjects = await db.select().from(projects);
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

    const inserted = await db
      .insert(projects)
      .values({
        slug,
        title: String(data.title || "Untitled").slice(0, 200),
        category: String(data.category || "Residential").slice(0, 80),
        location: data.location ? String(data.location).slice(0, 160) : null,
        locationCity: data.locationCity ? String(data.locationCity).slice(0, 80) : null,
        year: data.year ? String(data.year).slice(0, 12) : null,
        scope: data.scope ? String(data.scope).slice(0, 200) : null,
        description: String(data.description || "").slice(0, 4000),
        descriptionJson: data.descriptionJson ? String(data.descriptionJson).slice(0, 200000) : null,
        beforeImage: data.beforeImage
          ? String(data.beforeImage).slice(0, 500)
          : null,
        afterImage: data.afterImage
          ? String(data.afterImage).slice(0, 500)
          : null,
        model3d: data.model3d ? String(data.model3d).slice(0, 500) : null,
        galleryMediaIds: Array.isArray(data.galleryMediaIds)
          ? JSON.stringify(data.galleryMediaIds)
          : null,
        isPublished: data.isPublished !== false,
      })
      .returning();
    return NextResponse.json({ success: true, project: inserted[0] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Insert failed" },
      { status: 400 }
    );
  }
}
