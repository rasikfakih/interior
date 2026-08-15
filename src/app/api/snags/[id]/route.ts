import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgOne, withPgTx } from "@/lib/pg";
import { mapSnagRow, SNAG_PRIORITIES, SNAG_STATUSES, type SnagDto } from "@/lib/site-diary";
import { resolveAdminTenantId } from "@/lib/theme";

/**
 * Module 7 - single snag PATCH / DELETE. Tenant scoped. Status
 * transitions stamp fixed_at (open -> fixed) and verified_at
 * (fixed -> verified); moving back to open clears both.
 */

function toDto(r: Record<string, unknown>): SnagDto {
  return mapSnagRow(r);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  await ensureMigrated();
  const existing = await pgOne<{ id: string; tenant_id: number; status: string }>(
    `SELECT id, tenant_id, status FROM snags WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!existing || Number(existing.tenant_id) !== tenantId) {
    return NextResponse.json({ error: "Snag not found." }, { status: 404 });
  }

  const sets: string[] = [];
  const args: unknown[] = [];
  function push(col: string, value: unknown) {
    sets.push(`${col} = $${sets.length + 1}`);
    args.push(value);
  }
  // ISO timestamp bound from JS: SQLite has no NOW(), Postgres
  // accepts the ISO string for TIMESTAMPTZ, so one value works on
  // both runtimes without dialect-specific SQL.
  const now = new Date().toISOString();
  if (body.description != null) {
    const d = String(body.description).trim();
    if (!d) {
      return NextResponse.json({ error: "description cannot be empty." }, { status: 400 });
    }
    push("description", d);
  }
  if (body.assigned_to != null) {
    push(
      "assigned_to",
      body.assigned_to === "" ? null : String(body.assigned_to).slice(0, 200)
    );
  }
  if (body.priority != null) {
    if (!(SNAG_PRIORITIES as readonly string[]).includes(String(body.priority))) {
      return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
    }
    push("priority", String(body.priority));
  }

  const newStatus =
    body.status != null ? String(body.status) : existing.status;
  if (!(SNAG_STATUSES as readonly string[]).includes(newStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  if (body.status != null) {
    push("status", newStatus);
    const was = existing.status;
    // Stamp lifecycle timestamps on transitions. NOW() on both
    // runtimes (SQLite accepts it via the shim).
    if (newStatus === "open") {
      push("fixed_at", null);
      push("verified_at", null);
    } else if (newStatus === "fixed") {
      if (was !== "fixed") push("fixed_at", now);
      push("verified_at", null);
    } else if (newStatus === "verified") {
      if (was !== "fixed") push("fixed_at", now);
      push("verified_at", now);
    }
  }

  if (sets.length === 0) {
    const row = await pgOne<Record<string, unknown>>(
      `SELECT id, tenant_id, client_project_id, site_log_id, photo_url,
              description, status, assigned_to, priority, fixed_at,
              verified_at, created_at
       FROM snags WHERE id = $1 LIMIT 1`,
      [id]
    );
    return NextResponse.json({ snag: row ? toDto(row) : null });
  }

  args.push(id);
  const row = await withPgTx(async (client) => {
    const r = await client.query<Record<string, unknown>>(
      `UPDATE snags SET ${sets.join(", ")}
       WHERE id = $${sets.length + 1}
       RETURNING id, tenant_id, client_project_id, site_log_id,
                 photo_url, description, status, assigned_to, priority,
                 fixed_at, verified_at, created_at`,
      args
    );
    return r.rows[0];
  });
  return NextResponse.json({ snag: row ? toDto(row) : null });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const { id } = await ctx.params;
  await ensureMigrated();
  const existing = await pgOne<{ id: string; tenant_id: number }>(
    `SELECT id, tenant_id FROM snags WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!existing || Number(existing.tenant_id) !== tenantId) {
    return NextResponse.json({ error: "Snag not found." }, { status: 404 });
  }
  await withPgTx(async (client) => {
    await client.query(`DELETE FROM snags WHERE id = $1`, [id]);
  });
  return NextResponse.json({ ok: true });
}
