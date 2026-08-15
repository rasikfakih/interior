import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { withPgTx } from "@/lib/pg";
import {
  LEAD_STATUSES,
  normalizeLeadStatus,
  type LeadStatus,
} from "@/lib/leads";

type LeadRow = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  budget: string | null;
  status: string;
  score: number | string;
  lost_reason: string | null;
  last_status_change_at: string | null;
  created_at: string | null;
};

function rowToDto(row: LeadRow) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    source: row.source,
    budget: row.budget,
    status: row.status,
    score: Number(row.score ?? 0),
    lostReason: row.lost_reason,
    lastStatusChangeAt: row.last_status_change_at,
    createdAt: row.created_at,
  };
}

/**
 * POST /api/leads/[id]/status
 *
 * Single-status transition used by the kanban board drag and the
 * table's Move-to dropdown. The status is whitelisted server-side
 * (same list as src/lib/leads.ts) so the funnel can never drift.
 * One transaction: status + last_status_change_at = now() always,
 * lost_reason set when moving to lost and cleared on any other move.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  let d: { status?: unknown; lost_reason?: unknown };
  try {
    d = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const status = normalizeLeadStatus(d.status);
  if (!status) {
    return NextResponse.json(
      { error: `invalid status. Allowed: ${LEAD_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const lostReason: string | null =
    status === "lost"
      ? d.lost_reason
        ? String(d.lost_reason).trim().slice(0, 500)
        : null
      : null;

  try {
    const updated = await withPgTx(async (client) => {
      const res = await client.query(
        `UPDATE leads
            SET status = $1,
                last_status_change_at = CURRENT_TIMESTAMP,
                lost_reason = $2
          WHERE id = $3
          RETURNING *`,
        [status as LeadStatus, lostReason, Number(id)]
      );
      return res.rows?.[0] as LeadRow | undefined;
    });
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, item: rowToDto(updated) });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Status update failed" },
      { status: 400 }
    );
  }
}
