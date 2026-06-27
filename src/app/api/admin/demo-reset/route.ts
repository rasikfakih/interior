import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ensureMigrated, withPgTx } from "@/lib/pg";

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
    await ensureMigrated();
    await withPgTx(async (client) => {
      await client.query(`DELETE FROM page_blocks`);
      await client.query(`DELETE FROM media`);
      await client.query(`DELETE FROM projects`);
      await client.query(`DELETE FROM journal_posts`);
      await client.query(`DELETE FROM testimonials`);
      await client.query(`DELETE FROM team_members`);
      await client.query(`DELETE FROM revisions`);
    });
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
