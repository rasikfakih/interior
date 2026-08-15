import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { resolveAdminTenantId } from "@/lib/theme";
import { ensureMigrated, pgMany, pgOne, withPgTx } from "@/lib/pg";
import {
  BOQ_ITEM_SELECT,
  calcItemAmount,
  mapBoqItem,
  normalizeBoqCategory,
  normalizeBoqUnit,
} from "@/lib/boq";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ versionId: string }> };

/**
 * POST /api/boq/[versionId]/items
 *   {category, item_name, unit, qty, material_rate, labour_rate,
 *    wastage_pct, gst_pct, linked_material_id?, linked_board_item_id?}
 *   Computes the amount and refreshes the version total.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const { versionId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const itemName = String(body.item_name ?? "").trim();
  if (!itemName) {
    return NextResponse.json({ error: "item_name is required" }, { status: 400 });
  }
  const category = normalizeBoqCategory(body.category ?? "civil");
  const unit = normalizeBoqUnit(body.unit ?? "nos");
  if (!category || !unit) {
    return NextResponse.json({ error: "invalid category or unit" }, { status: 400 });
  }
  const qty = Number(body.qty ?? 1);
  const materialRate = Number(body.material_rate ?? 0);
  const labourRate = Number(body.labour_rate ?? 0);
  const wastagePct = Number(body.wastage_pct ?? 5);
  const gstPct = Number(body.gst_pct ?? 18);
  if (![qty, materialRate, labourRate, wastagePct, gstPct].every(Number.isFinite)) {
    return NextResponse.json({ error: "invalid numbers" }, { status: 400 });
  }

  await ensureMigrated();
  const version = await pgOne<{ tenant_id: number }>(
    `SELECT tenant_id FROM boq_versions WHERE id = $1 LIMIT 1`,
    [versionId]
  );
  if (!version) return NextResponse.json({ error: "version not found" }, { status: 404 });
  if (version.tenant_id !== tenantId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const linkedMaterialId = body.linked_material_id == null ? null : String(body.linked_material_id);
  const linkedBoardItemId =
    body.linked_board_item_id == null ? null : String(body.linked_board_item_id);
  if (linkedMaterialId) {
    const mat = await pgOne<{ tenant_id: number }>(
      `SELECT tenant_id FROM materials WHERE id = $1 LIMIT 1`,
      [linkedMaterialId]
    );
    if (!mat) return NextResponse.json({ error: "material not found" }, { status: 404 });
    if (mat.tenant_id !== tenantId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const itemId = crypto.randomUUID();
  const amount = calcItemAmount(qty, materialRate, labourRate, wastagePct, gstPct);

  await withPgTx(async (client) => {
    await client.query(
      `INSERT INTO boq_items
         (id, boq_version_id, tenant_id, category, item_name, unit,
          qty, material_rate, labour_rate, wastage_pct, gst_pct,
          amount, linked_material_id, linked_board_item_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        itemId, versionId, tenantId, category, itemName, unit,
        qty, materialRate, labourRate, wastagePct, gstPct,
        amount, linkedMaterialId, linkedBoardItemId,
      ]
    );
    await client.query(
      `UPDATE boq_versions SET total = (
         SELECT COALESCE(SUM(amount), 0) FROM boq_items WHERE boq_version_id = $1
       ), updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [versionId, versionId]
    );
  });

  const row = await pgOne<Record<string, unknown>>(
    `${BOQ_ITEM_SELECT} WHERE bi.id = $1 LIMIT 1`,
    [itemId]
  );
  return NextResponse.json({ item: row ? mapBoqItem(row) : null }, { status: 201 });
}
