import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgOne, withPgTx } from "@/lib/pg";
import { resolveAdminTenantId } from "@/lib/theme";
import {
  materialDto,
  normalizeMaterialCategory,
  normalizeMaterialUnit,
  normalizeStockStatus,
  type MaterialDto,
} from "@/lib/materials";

/**
 * Material update / delete. PATCH accepts partial field updates
 * (whitelisted values at the boundary); vendor changes are re-verified
 * against the tenant. DELETE removes the row (storage object removal
 * is skipped - the row owns the display URL only).
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
      `SELECT id FROM materials WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
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
          { error: "invalid category value" },
          { status: 400 }
        );
      }
      updates.push(`category = $${i++}`);
      args.push(category);
    }
    if (d.unit !== undefined) {
      const unit = normalizeMaterialUnit(d.unit);
      if (!unit) {
        return NextResponse.json({ error: "invalid unit value" }, { status: 400 });
      }
      updates.push(`unit = $${i++}`);
      args.push(unit);
    }
    if (d.stock_status !== undefined) {
      const stockStatus = normalizeStockStatus(d.stock_status);
      if (!stockStatus) {
        return NextResponse.json({ error: "invalid stock_status value" }, { status: 400 });
      }
      updates.push(`stock_status = $${i++}`);
      args.push(stockStatus);
    }
    if (typeof d.sku === "string") {
      updates.push(`sku = $${i++}`);
      args.push(d.sku.trim().slice(0, 128) || null);
    }
    if (typeof d.image_url === "string") {
      updates.push(`image_url = $${i++}`);
      args.push(d.image_url.trim() || null);
    }
    if (d.cost_per_unit !== undefined) {
      const cost = Number(d.cost_per_unit);
      updates.push(`cost_per_unit = $${i++}`);
      args.push(Number.isFinite(cost) && cost > 0 ? cost : 0);
    }
    if (d.vendor_id !== undefined) {
      let vendorId: string | null = null;
      if (d.vendor_id !== null && d.vendor_id !== "") {
        vendorId = String(d.vendor_id);
        const vendor = await pgOne<{ id: string }>(
          `SELECT id FROM vendors WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
          [vendorId, tenantId]
        );
        if (!vendor) {
          return NextResponse.json(
            { error: "Vendor not found for this tenant." },
            { status: 400 }
          );
        }
      }
      updates.push(`vendor_id = $${i++}`);
      args.push(vendorId);
    }
    if (d.specs_json !== undefined && d.specs_json !== null) {
      updates.push(`specs_json = $${i++}::jsonb`);
      args.push(
        JSON.stringify(
          d.specs_json && typeof d.specs_json === "object"
            ? d.specs_json
            : {}
        )
      );
    }
    if (updates.length === 0) {
      return NextResponse.json({ success: true, noop: true });
    }
    args.push(id);
    const row = await pgOneMaterial(
      `UPDATE materials SET ${updates.join(", ")} WHERE id = $${i} RETURNING *`,
      args
    );
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, material: row });
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
      const res = await client.query(
        `DELETE FROM materials WHERE id = $1 AND tenant_id = $2`,
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

async function pgOneMaterial(
  sql: string,
  args: unknown[]
): Promise<MaterialDto | null> {
  const row = await pgOne<Record<string, unknown>>(sql, args);
  return row ? materialDto(row) : null;
}
