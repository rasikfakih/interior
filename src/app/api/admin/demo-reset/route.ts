import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { openDb } from "@/lib/db";

async function ok() {
  const session = await getServerSession(authOptions);
  return Boolean((session?.user as any)?.id);
}

export async function POST(req: NextRequest) {
  if (!(await ok())) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Demo reset is disabled in production. Use database migrations instead." },
      { status: 403 }
    );
  }
  try {
    const sqlite = openDb();
    sqlite.exec(`
      DELETE FROM page_blocks;
      DELETE FROM media;
      DELETE FROM projects;
      DELETE FROM journal_posts;
      DELETE FROM testimonials;
      DELETE FROM team_members;
      DELETE FROM revisions;
    `);
    sqlite.close();
    return NextResponse.json({
      success: true,
      message: "Demo data reset. Pages, media, blocks cleared.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Reset failed" },
      { status: 500 }
    );
  }
}
