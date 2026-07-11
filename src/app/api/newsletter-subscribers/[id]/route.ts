import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { appendAudit } from "@/lib/license";
import { ensureMigrated, pgOne, pgQuery } from "@/lib/pg";
import { bump } from "@/lib/revalidate";

/**
 * TS-006 Phase C - soft-delete a newsletter subscriber.
 *
 * PATCH (re-activate):
 *   - Sets active=1 again, audit_log entry: kind=newsletter.reactivate
 *
 * DELETE (soft-delete):
 *   - Sets active=0, audit_log entry: kind=newsletter.deactivate
 *
 * Hard delete via DELETE ?hard=1 is intentionally NOT exposed:
 * the public form's append-only history is preserved. Reactivating
 * via PATCH keeps the same id and subscribed_at so the row can
 * be re-included in dedupe.
 */

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return new NextResponse(gate.response.body, gate.response);
  }
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId) || !Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await ensureMigrated();
  const row = (await pgOne(
    `SELECT id, email, active FROM newsletter_subscribers WHERE id = $1 LIMIT 1`,
    [numId]
  )) as { id: number; email: string; active: number | boolean } | null;
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await pgQuery(
    `UPDATE newsletter_subscribers SET active = 0 WHERE id = $1`,
    [numId]
  );
  await appendAudit(
    "newsletter.deactivate",
    `newsletter subscriber ${row.email} deactivated`,
    {
      id: numId,
      email: row.email,
      role: gate.role,
    }
  );
  bump({ kind: "settings" });
  return NextResponse.json({ success: true, id: numId, active: 0 });
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return new NextResponse(gate.response.body, gate.response);
  }
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId) || !Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await ensureMigrated();
  const row = (await pgOne(
    `SELECT id, email, active FROM newsletter_subscribers WHERE id = $1 LIMIT 1`,
    [numId]
  )) as { id: number; email: string; active: number | boolean } | null;
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await pgQuery(
    `UPDATE newsletter_subscribers SET active = 1 WHERE id = $1`,
    [numId]
  );
  await appendAudit(
    "newsletter.reactivate",
    `newsletter subscriber ${row.email} reactivated`,
    {
      id: numId,
      email: row.email,
      role: gate.role,
    }
  );
  bump({ kind: "settings" });
  return NextResponse.json({ success: true, id: numId, active: 1 });
}
