import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgOne, withPgTx } from "@/lib/pg";
import { resolveAdminTenantId } from "@/lib/theme";
import {
  normalizeMaterialCategory,
  vendorDto,
  type VendorDto,
} from "@/lib/materials";

/**
 * Vendor update / delete. DELETE detaches (sets vendor_id NULL on)
 * any linked materials inside the same transaction - FK actions are
 * off on the SQLite fallback, so the route is the source of truth on
 * both runtimes.
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
    const tenantId = await resolveAdminTenantId();
    if (tenantId == null) {
      return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
    }
    await ensureMigrated();
    const exists = await pgOne<{ id: string }>(
      `SELECT id FROM vendors WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [id, tenantId]
    );
    if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updates: string[] = [];
    const args: unknown[] = [];
    let i = 1;
    if (typeof d.name === "string") {
      const name = d.name.trim();
      if (!name) {
        return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      }
      updates.push(`name = $${i++}`);
      args.push(name);
    }
    if (d.category !== undefined) {
      const category = normalizeMaterialCategory(d.category);
      if (!category) {
        return NextResponse.json(
          { error: `invalid category. Allowed: stone, wood, textile, hardware, lighting, furniture, paint, civil, electrical, plumbing, other` },
          { status: 400 }
        );
      }
      updates.push(`category = $${i++}`);
      args.push(category);
    }
    for (const [key, max] of [
      ["phone", 64],
      ["email", 255],
      ["address", 500],
      ["notes", 2000],
    ] as const) {
      if (typeof d[key] === "string") {
        updates.push(`${key} = $${i++}`);
        args.push(d[key].trim().slice(0, max) || null);
      }
    }
    if (typeof d.lead_time_days === "number") {
      updates.push(`lead_time_days = $${i++}`);
      args.push(Math.max(0, Math.round(d.lead_time_days)));
    }
    if (typeof d.rating === "number") {
      updates.push(`rating = $${i++}`);
      args.push(Math.max(0, Math.min(5, Math.round(d.rating))));
    }
    if (updates.length === 0) {
      return NextResponse.json({ success: true, noop: true });
    }
    args.push(id);
    const row = await pgOneVendor(`UPDATE vendors SET ${updates.join(", ")} WHERE id = $${i} RETURNING *`, args);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, vendor: row });
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
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  await ensureMigrated();
  try {
    await withPgTx(async (client) => {
      // Detach linked materials first (dialect-neutral SET NULL).
      await client.query(
        `UPDATE materials SET vendor_id = NULL WHERE vendor_id = $1`,
        [id]
      );
      const res = await client.query(
        `DELETE FROM vendors WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
      if (res.rowCount === 0) {
        throw new Error("not-found");
      }
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "not-found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: msg || "Delete failed" }, { status: 400 });
  }
}

async function pgOneVendor(
  sql: string,
  args: unknown[]
): Promise<VendorDto | null> {
  const row = await pgOne<Record<string, unknown>>(sql, args);
  return row ? vendorDto(row) : null;
}
