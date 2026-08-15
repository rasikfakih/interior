import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgOne, withPgTx } from "@/lib/pg";
import { mapSiteLogRow, type SiteLogDto } from "@/lib/site-diary";
import { resolveAdminTenantId } from "@/lib/theme";

/**
 * Module 7 - single site log PATCH / DELETE. Tenant scoped; the row is
 * looked up through the project's tenant so cross-tenant ids 404.
 */

function toDto(r: Record<string, unknown>): SiteLogDto {
  return mapSiteLogRow(r);
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
  const existing = await pgOne<{ id: string; tenant_id: number }>(
    `SELECT id, tenant_id FROM site_logs WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!existing || Number(existing.tenant_id) !== tenantId) {
    return NextResponse.json({ error: "Log not found." }, { status: 404 });
  }

  const sets: string[] = [];
  const args: unknown[] = [];
  function push(col: string, value: unknown) {
    sets.push(`${col} = $${sets.length + 1}`);
    args.push(value);
  }
  if (body.labour_count != null) {
    push("labour_count", Math.max(0, Math.round(Number(body.labour_count) || 0)));
  }
  if (body.work_done != null) {
    push("work_done", String(body.work_done).slice(0, 8000));
  }
  if (body.voice_transcript != null) {
    push("voice_transcript", String(body.voice_transcript).slice(0, 8000));
  }
  if (body.weather != null) {
    push("weather", String(body.weather).slice(0, 20));
  }
  if (body.photos != null) {
    const photos = Array.isArray(body.photos)
      ? (body.photos as unknown[]).map((p) => String(p)).filter(Boolean)
      : [];
    push("photos", JSON.stringify(photos));
  }
  if (sets.length === 0) {
    const row = await pgOne<Record<string, unknown>>(
      `SELECT id, tenant_id, client_project_id, log_date, photos,
              labour_count, work_done, voice_transcript, weather,
              created_by, created_at
       FROM site_logs WHERE id = $1 LIMIT 1`,
      [id]
    );
    return NextResponse.json({ log: row ? toDto(row) : null });
  }
  args.push(id);
  const row = await withPgTx(async (client) => {
    const r = await client.query<Record<string, unknown>>(
      `UPDATE site_logs SET ${sets.join(", ")}
       WHERE id = $${sets.length + 1}
       RETURNING id, tenant_id, client_project_id, log_date, photos,
                 labour_count, work_done, voice_transcript, weather,
                 created_by, created_at`,
      args
    );
    return r.rows[0];
  });
  return NextResponse.json({ log: row ? toDto(row) : null });
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
    `SELECT id, tenant_id FROM site_logs WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!existing || Number(existing.tenant_id) !== tenantId) {
    return NextResponse.json({ error: "Log not found." }, { status: 404 });
  }
  await withPgTx(async (client) => {
    // Snags linked to this log survive with site_log_id nulled (the
    // SQLite fallback has foreign_keys off, so do it explicitly).
    await client.query(
      `UPDATE snags SET site_log_id = NULL WHERE site_log_id = $1`,
      [id]
    );
    await client.query(`DELETE FROM site_logs WHERE id = $1`, [id]);
  });
  return NextResponse.json({ ok: true });
}
