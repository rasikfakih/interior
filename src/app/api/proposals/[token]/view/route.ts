import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, pgOne, withPgTx } from "@/lib/pg";

/**
 * PUBLIC view beacon - optional client-side re-fire for tracking.
 * The GET /api/proposals/[token] already increments on fetch; this
 * POST exists for cases where a client wants to record a view without
 * re-fetching the whole document (e.g. after hydration).
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  if (!/^[A-Za-z0-9]{8,12}$/.test(token)) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }
  await ensureMigrated();
  const exists = await pgOne<{ id: string }>(
    `SELECT id FROM proposals WHERE token = $1 LIMIT 1`,
    [token]
  );
  if (!exists) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }
  try {
    await withPgTx(async (client) => {
      await client.query(
        `UPDATE proposals
         SET viewed_count = viewed_count + 1,
             viewed_at = CASE WHEN viewed_at IS NULL THEN CURRENT_TIMESTAMP ELSE viewed_at END,
             status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END
         WHERE token = $1`,
        [token]
      );
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Tracking failed" }, { status: 400 });
  }
}
