import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/license-gate";
import { ensureMigrated, withPgTx } from "@/lib/pg";

export async function POST(req: NextRequest) {
  const gate = await requireSuperadmin();
  if (!gate.ok) return gate.response;
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
