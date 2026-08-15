import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgMany, pgOne, withPgTx } from "@/lib/pg";
import { resolveAdminTenantId } from "@/lib/theme";
import {
  MATERIAL_CATEGORIES,
  normalizeMaterialCategory,
  vendorDto,
  type VendorDto,
} from "@/lib/materials";

/**
 * Vendor library (Module 4). GET lists tenant-scoped vendors with
 * category + search filters and a materials count; POST creates one.
 * Gated by requireAdminSession; the tenant comes from
 * resolveAdminTenantId() like every other admin surface.
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
  const q = (sp.get("search") ?? "").trim();

  await ensureMigrated();
  const where: string[] = ["v.tenant_id = $1"];
  const args: unknown[] = [tenantId];
  if (category && MATERIAL_CATEGORIES.includes(category as (typeof MATERIAL_CATEGORIES)[number])) {
    where.push(`v.category = $${args.length + 1}`);
    args.push(category);
  }
  if (q) {
    // Distinct $N per occurrence: the SQLite shim rewrites each $N to
    // its own ? so a reused placeholder binds too few values.
    const n = args.length + 1;
    where.push(
      `(LOWER(v.name) LIKE LOWER($${n}) OR LOWER(COALESCE(v.phone, '')) LIKE LOWER($${n + 1}))`
    );
    args.push(`%${q}%`, `%${q}%`);
  }
  const rows = await pgMany<Record<string, unknown>>(
    `SELECT v.*, (SELECT COUNT(*) FROM materials m WHERE m.vendor_id = v.id) AS materials_count
     FROM vendors v
     WHERE ${where.join(" AND ")}
     ORDER BY v.name ASC, v.id ASC`,
    args
  );
  const vendors: VendorDto[] = rows.map((r) => vendorDto(r));
  return NextResponse.json({ vendors });
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
  const rating = Math.max(0, Math.min(5, Math.round(Number(body?.rating) || 0)));
  const leadTimeDays = Math.max(0, Math.round(Number(body?.lead_time_days) || 7));

  await ensureMigrated();
  try {
    const id = crypto.randomUUID();
    await withPgTx(async (client) => {
      await client.query(
        `INSERT INTO vendors
           (id, tenant_id, name, category, phone, email, address,
            lead_time_days, rating, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          id,
          tenantId,
          name,
          category,
          String(body?.phone ?? "").trim() || null,
          String(body?.email ?? "").trim() || null,
          String(body?.address ?? "").trim() || null,
          leadTimeDays,
          rating,
          String(body?.notes ?? "").trim() || null,
        ]
      );
    });
    const row = await pgOneVendor(id);
    return NextResponse.json({ vendor: row });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Create failed" }, { status: 400 });
  }
}

async function pgOneVendor(id: string): Promise<VendorDto | null> {
  const row = await pgOne<Record<string, unknown>>(
    `SELECT v.*, (SELECT COUNT(*) FROM materials m WHERE m.vendor_id = v.id) AS materials_count
     FROM vendors v WHERE v.id = $1 LIMIT 1`,
    [id]
  );
  return row ? vendorDto(row) : null;
}
