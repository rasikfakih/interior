import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamMembers } from "@/lib/schema";

async function isAuthorized() {
  const session = await getServerSession(authOptions);
  return Boolean((session?.user as any)?.id);
}

export async function GET() {
  const rows = await db.select().from(teamMembers);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const d = await req.json();
    if (!d.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const inserted = await db
      .insert(teamMembers)
      .values({
        name: String(d.name).slice(0, 160),
        role: d.role ? String(d.role).slice(0, 160) : null,
        bio: d.bio ? String(d.bio).slice(0, 2000) : null,
        photo: d.photo ? String(d.photo).slice(0, 500) : null,
        order: typeof d.order === "number" ? d.order : 0,
        isPublished: d.isPublished !== false,
      })
      .returning();
    return NextResponse.json({ success: true, item: inserted[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Insert failed" }, { status: 400 });
  }
}
