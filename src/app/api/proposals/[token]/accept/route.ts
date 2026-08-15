import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, pgOne, withPgTx } from "@/lib/pg";

/**
 * PUBLIC proposal acceptance by share token - no auth. Sets the
 * proposal approved, stamps accepted_at / accepted_by_name, advances
 * the linked project to design, and moves the linked lead to won
 * (with last_status_change_at) so the pipeline closes Lead -> Won.
 * Everything runs in one transaction.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  if (!/^[A-Za-z0-9]{8,12}$/.test(token)) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }
  let body: Record<string, unknown> | undefined;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const acceptedByName = String(body?.accepted_by_name ?? "").trim();
  if (!acceptedByName) {
    return NextResponse.json({ error: "accepted_by_name is required." }, { status: 400 });
  }

  await ensureMigrated();
  const proposal = await pgOne<{
    id: string;
    project_id: string;
    lead_id: number | null;
    status: string;
  }>(
    `SELECT id, project_id, lead_id, status FROM proposals WHERE token = $1 LIMIT 1`,
    [token]
  );
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }
  if (proposal.status === "approved") {
    return NextResponse.json({ ok: true, alreadyApproved: true });
  }

  try {
    await withPgTx(async (client) => {
      await client.query(
        `UPDATE proposals
         SET status = 'approved', accepted_at = CURRENT_TIMESTAMP, accepted_by_name = $1
         WHERE token = $2`,
        [acceptedByName, token]
      );
      // Project advances to design once the client accepts.
      await client.query(
        `UPDATE client_projects SET status = 'design' WHERE id = $1`,
        [proposal.project_id]
      );
      // The lead closes as won (terminal state, never regressed).
      if (proposal.lead_id != null) {
        await client.query(
          `UPDATE leads
           SET status = 'won', last_status_change_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND status NOT IN ('won', 'lost')`,
          [proposal.lead_id]
        );
      }
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Accept failed" }, { status: 400 });
  }
}
