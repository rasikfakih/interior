import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { resolveAdminTenantId } from "@/lib/theme";
import { ensureMigrated, pgMany, pgOne, withPgTx } from "@/lib/pg";
import {
  BOQ_ITEM_SELECT,
  calcItemAmount,
  mapBoqItem,
  mapBoqVersion,
  type BoqVersionDto,
} from "@/lib/boq";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ versionId: string }> };

/**
 * POST /api/boq/[versionId]/recalculate
 *   Refreshes material_rate from each linked material's live
 *   cost_per_unit, recomputes every item amount, and rewrites the
 *   version total. Call this after material costs change ("Pull
 *   latest cost").
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const { versionId } = await params;

  await ensureMigrated();
  const version = await pgOne<{ tenant_id: number }>(
    `SELECT tenant_id FROM boq_versions WHERE id = $1 LIMIT 1`,
    [versionId]
  );
  if (!version) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (version.tenant_id !== tenantId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const items = await pgMany<Record<string, unknown>>(
    `SELECT bi.id, bi.qty, bi.material_rate, bi.labour_rate,
            bi.wastage_pct, bi.gst_pct, bi.linked_material_id,
            m.cost_per_unit AS live_cost
     FROM boq_items bi
     LEFT JOIN materials m ON m.id = bi.linked_material_id
     WHERE bi.boq_version_id = $1`,
    [versionId]
  );

  await withPgTx(async (client) => {
    let total = 0;
    for (const it of items) {
      const liveCost =
        it.live_cost == null ? null : Number(it.live_cost);
      const materialRate =
        liveCost != null ? liveCost : Number(it.material_rate ?? 0);
      const amount = calcItemAmount(
        Number(it.qty ?? 1),
        materialRate,
        Number(it.labour_rate ?? 0),
        Number(it.wastage_pct ?? 5),
        Number(it.gst_pct ?? 18)
      );
      total += amount;
      await client.query(
        `UPDATE boq_items SET material_rate = $1, amount = $2 WHERE id = $3`,
        [materialRate, amount, String(it.id)]
      );
    }
    total = Math.round(total * 100) / 100;
    await client.query(
      `UPDATE boq_versions SET total = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [total, versionId]
    );
  });

  const row = await pgOne<Record<string, unknown>>(
    `SELECT * FROM boq_versions WHERE id = $1 LIMIT 1`,
    [versionId]
  );
  const itemRows = await pgMany<Record<string, unknown>>(
    `${BOQ_ITEM_SELECT} WHERE bi.boq_version_id = $1 ORDER BY bi.created_at ASC`,
    [versionId]
  );
  const dto: BoqVersionDto | null = row
    ? { ...mapBoqVersion(row), items: itemRows.map((r) => mapBoqItem(r)) }
    : null;
  return NextResponse.json({ version: dto });
}
