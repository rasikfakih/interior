import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import { bump } from "@/lib/revalidate";

async function isAuthorized() {
  const session = await getServerSession(authOptions);
  return Boolean((session?.user as any)?.id);
}

export async function GET() {
  await ensureMigrated();
  const rows = await pgMany(
    `SELECT * FROM testimonials ORDER BY id ASC`
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const d = await req.json();
    if (!d.name || !d.quote) {
      return NextResponse.json(
        { error: "name and quote are required" },
        { status: 400 }
      );
    }
    await ensureMigrated();
    const inserted = await pgOne(
      `INSERT INTO testimonials
         (name, role, photo, quote, is_published)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        String(d.name).slice(0, 160),
        d.role ? String(d.role).slice(0, 160) : null,
        d.photo ? String(d.photo).slice(0, 500) : null,
        String(d.quote).slice(0, 2000),
        Boolean(d.isPublished !== false),
      ]
    );
    bump({ kind: "testimonials" });
    return NextResponse.json({ success: true, item: inserted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Insert failed" }, { status: 400 });
  }
}
