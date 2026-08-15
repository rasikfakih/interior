import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgOne, pgQuery } from "@/lib/pg";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  normalizeLeadSource,
  normalizeLeadStatus,
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
  client_project_id?: string | null;
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
    clientProjectId: row.client_project_id ?? null,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  await ensureMigrated();
  const row = await pgOne<LeadRow>(
    `SELECT l.*, cp.id AS client_project_id
     FROM leads l
     LEFT JOIN client_projects cp ON cp.lead_id = l.id
     WHERE l.id = $1`,
    [Number(id)]
  );
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rowToDto(row));
}

/**
 * PATCH /api/leads/[id]
 *
 * Partial update for the funnel fields (status, score) plus the
 * editable contact fields. Status changes also stamp
 * last_status_change_at and manage lost_reason exactly like the
 * dedicated POST /api/leads/[id]/status route, so either endpoint
 * leaves the funnel consistent. Unknown status/source values are
 * rejected so the stat funnel never drifts.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    const d = await req.json();
    const updates: string[] = [];
    const args: unknown[] = [];
    let i = 1;

    if (typeof d.name === "string") {
      const name = d.name.trim().slice(0, 255);
      if (!name) {
        return NextResponse.json(
          { error: "name cannot be empty" },
          { status: 400 }
        );
      }
      updates.push(`name = $${i++}`);
      args.push(name);
    }
    if (typeof d.phone === "string") {
      updates.push(`phone = $${i++}`);
      args.push(d.phone.trim().slice(0, 64) || null);
    }
    if (typeof d.email === "string") {
      updates.push(`email = $${i++}`);
      args.push(d.email.trim().slice(0, 255) || null);
    }
    if (typeof d.budget === "string") {
      updates.push(`budget = $${i++}`);
      args.push(d.budget.trim().slice(0, 128) || null);
    }
    if (d.status !== undefined) {
      const status = normalizeLeadStatus(d.status);
      if (!status) {
        return NextResponse.json(
          {
            error: `invalid status. Allowed: ${LEAD_STATUSES.join(", ")}`,
          },
          { status: 400 }
        );
      }
      updates.push(`status = $${i++}`);
      args.push(status);
      // Same semantics as the dedicated status route.
      updates.push(`last_status_change_at = CURRENT_TIMESTAMP`);
      const lostReason: string | null =
        status === "lost"
          ? typeof d.lost_reason === "string"
            ? d.lost_reason.trim().slice(0, 500) || null
            : null
          : null;
      updates.push(`lost_reason = $${i++}`);
      args.push(lostReason);
    } else if (typeof d.lost_reason === "string") {
      updates.push(`lost_reason = $${i++}`);
      args.push(d.lost_reason.trim().slice(0, 500) || null);
    }
    if (d.source !== undefined) {
      const source = normalizeLeadSource(d.source);
      if (!source) {
        return NextResponse.json(
          { error: `invalid source. Allowed: ${LEAD_SOURCES.join(", ")}` },
          { status: 400 }
        );
      }
      updates.push(`source = $${i++}`);
      args.push(source);
    }
    if (typeof d.score === "number") {
      const score = Math.max(0, Math.min(100, Math.round(d.score)));
      updates.push(`score = $${i++}`);
      args.push(score);
    }
    if (updates.length === 0) return NextResponse.json({ success: true, noop: true });

    const numericId = Number(id);
    args.push(numericId);
    const q = await pgQuery<LeadRow>(
      `UPDATE leads SET ${updates.join(", ")} WHERE id = $${i} RETURNING *`,
      args
    );
    const row = q.rows?.[0];
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, item: rowToDto(row) });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Update failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  await ensureMigrated();
  await pgQuery(`DELETE FROM leads WHERE id = $1`, [Number(id)]);
  return NextResponse.json({ success: true });
}
