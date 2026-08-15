import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgMany, pgOne, withPgTx } from "@/lib/pg";
import { resolveAdminTenantId } from "@/lib/theme";
import {
  MATERIAL_CATEGORIES,
  STOCK_STATUSES,
  materialDto,
  normalizeMaterialCategory,
  normalizeMaterialUnit,
  normalizeStockStatus,
  type MaterialDto,
} from "@/lib/materials";

/**
 * Material library (Module 4). GET lists tenant-scoped materials with
 * category / vendor / stock_status filters + name/sku search, joining
 * the vendor name. POST creates one; a vendor_id is verified to belong
 * to the same tenant. Gated by requireAdminSession.
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const sp = req.nextUrl.searchParams;
  const category = sp.get("category") ?? "";
  const vendorId = sp.get("vendor_id") ?? "";
  const stockStatus = sp.get("stock_status") ?? "";
  const q = (sp.get("search") ?? "").trim();

  await ensureMigrated();
  const where: string[] = ["m.tenant_id = $1"];
  const args: unknown[] = [tenantId];
  if (category && MATERIAL_CATEGORIES.includes(category as (typeof MATERIAL_CATEGORIES)[number])) {
    where.push(`m.category = $${args.length + 1}`);
    args.push(category);
  }
  if (vendorId) {
    where.push(`m.vendor_id = $${args.length + 1}`);
    args.push(vendorId);
  }
  if (stockStatus && STOCK_STATUSES.includes(stockStatus as (typeof STOCK_STATUSES)[number])) {
    where.push(`m.stock_status = $${args.length + 1}`);
    args.push(stockStatus);
  }
  if (q) {
    const n = args.length + 1;
    where.push(
      `(LOWER(m.name) LIKE LOWER($${n}) OR LOWER(COALESCE(m.sku, '')) LIKE LOWER($${n + 1}))`
    );
    args.push(`%${q}%`, `%${q}%`);
  }
  const rows = await pgMany<Record<string, unknown>>(
    `SELECT m.*, v.name AS vendor_name
     FROM materials m
     LEFT JOIN vendors v ON v.id = m.vendor_id
     WHERE ${where.join(" AND ")}
     ORDER BY m.created_at DESC, m.id DESC`,
    args
  );
  const materials: MaterialDto[] = rows.map((r) => materialDto(r));
  return NextResponse.json({ materials });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  let body: Record<string, unknown> | undefined;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const name = String(body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  const category = normalizeMaterialCategory(body?.category) ?? "other";
  const unit = normalizeMaterialUnit(body?.unit) ?? "nos";
  const stockStatus = normalizeStockStatus(body?.stock_status) ?? "in_stock";

  // vendor_id must belong to this tenant when provided.
  let vendorId: string | null = null;
  if (body?.vendor_id != null && body?.vendor_id !== "") {
    vendorId = String(body.vendor_id);
    await ensureMigrated();
    const vendor = await pgOne<{ id: string }>(
      `SELECT id FROM vendors WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [vendorId, tenantId]
    );
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found for this tenant." }, { status: 400 });
    }
  }
  const costPerUnit = Number(body?.cost_per_unit);
  const cost = Number.isFinite(costPerUnit) && costPerUnit > 0 ? costPerUnit : 0;

  const specs =
    body?.specs_json && typeof body?.specs_json === "object"
      ? (body.specs_json as Record<string, string>)
      : {};
  const gallery =
    Array.isArray(body?.gallery_urls) ? body.gallery_urls : [];

  await ensureMigrated();
  try {
    const id = crypto.randomUUID();
    await withPgTx(async (client) => {
      await client.query(
        `INSERT INTO materials
           (id, tenant_id, vendor_id, name, category, sku, cost_per_unit,
            unit, image_url, gallery_urls, specs_json, stock_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12)`,
        [
          id,
          tenantId,
          vendorId,
          name,
          category,
          String(body?.sku ?? "").trim() || null,
          cost,
          unit,
          String(body?.image_url ?? "").trim() || null,
          JSON.stringify(gallery),
          JSON.stringify(specs),
          stockStatus,
        ]
      );
    });
    const row = await pgOneMaterial(id);
    return NextResponse.json({ material: row });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Create failed" }, { status: 400 });
  }
}

async function pgOneMaterial(id: string): Promise<MaterialDto | null> {
  const row = await pgOne<Record<string, unknown>>(
    `SELECT m.*, v.name AS vendor_name
     FROM materials m
     LEFT JOIN vendors v ON v.id = m.vendor_id
     WHERE m.id = $1 LIMIT 1`,
    [id]
  );
  return row ? materialDto(row) : null;
}
