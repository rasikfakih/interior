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
  const rows = await pgMany(
    `SELECT * FROM team_members
     ORDER BY "order" ASC, id ASC`
  );
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
    await ensureMigrated();
    const inserted = await pgOne(
      `INSERT INTO team_members
         (name, role, bio, photo, "order", is_published)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        String(d.name).slice(0, 160),
        d.role ? String(d.role).slice(0, 160) : null,
        d.bio ? String(d.bio).slice(0, 2000) : null,
        d.photo ? String(d.photo).slice(0, 500) : null,
        typeof d.order === "number" ? d.order : 0,
        Boolean(d.isPublished !== false),
      ]
    );
    return NextResponse.json({ success: true, item: inserted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Insert failed" }, { status: 400 });
  }
}
