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

type Params = { params: Promise<{ id: string }> };

/** Load the version a boq_item belongs to (for tenant checks). */
async function itemVersionId(itemId: string): Promise<string | null> {
  const row = await pgOne<{ boq_version_id: string }>(
    `SELECT boq_version_id FROM boq_items WHERE id = $1 LIMIT 1`,
    [itemId]
  );
  return row?.boq_version_id ?? null;
}

async function recalcVersion(versionId: string) {
  await pgMany(
    `UPDATE boq_versions SET total = (
       SELECT COALESCE(SUM(amount), 0) FROM boq_items WHERE boq_version_id = $1
     ), updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [versionId, versionId]
  );
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  await ensureMigrated();
  const versionId = await itemVersionId(id);
  if (!versionId) return NextResponse.json({ error: "not found" }, { status: 404 });
  const version = await pgOne<{ tenant_id: number }>(
    `SELECT tenant_id FROM boq_versions WHERE id = $1 LIMIT 1`,
    [versionId]
  );
  if (!version || version.tenant_id !== tenantId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Verify cross-tenant links before writing.
  const linkedMaterialId =
    body.linked_material_id === undefined
      ? undefined
      : body.linked_material_id == null
        ? null
        : String(body.linked_material_id);
  if (linkedMaterialId && linkedMaterialId !== null) {
    const mat = await pgOne<{ tenant_id: number }>(
      `SELECT tenant_id FROM materials WHERE id = $1 LIMIT 1`,
      [linkedMaterialId]
    );
    if (!mat) return NextResponse.json({ error: "material not found" }, { status: 404 });
    if (mat.tenant_id !== tenantId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const sets: string[] = [];
  const args: unknown[] = [];
  const push = (sql: string, value: unknown) => {
    args.push(value);
    sets.push(sql.replace("$n", `$${args.length}`));
  };

  if (body.category !== undefined) {
    const c = normalizeBoqCategory(body.category);
    if (!c) return NextResponse.json({ error: "invalid category" }, { status: 400 });
    push("category = $n", c);
  }
  if (body.item_name !== undefined) {
    const name = String(body.item_name ?? "").trim();
    if (!name) return NextResponse.json({ error: "item_name is required" }, { status: 400 });
    push("item_name = $n", name);
  }
  if (body.description !== undefined) {
    push("description = $n", body.description === null ? null : String(body.description));
  }
  if (body.unit !== undefined) {
    const u = normalizeBoqUnit(body.unit);
    if (!u) return NextResponse.json({ error: "invalid unit" }, { status: 400 });
    push("unit = $n", u);
  }
  const numeric: { key: "qty" | "material_rate" | "labour_rate" | "wastage_pct" | "gst_pct"; field: string }[] = [
    { key: "qty", field: "qty" },
    { key: "material_rate", field: "material_rate" },
    { key: "labour_rate", field: "labour_rate" },
    { key: "wastage_pct", field: "wastage_pct" },
    { key: "gst_pct", field: "gst_pct" },
  ];
  for (const n of numeric) {
    if (body[n.key] !== undefined) {
      const v = Number(body[n.key]);
      if (!Number.isFinite(v)) return NextResponse.json({ error: `invalid ${n.key}` }, { status: 400 });
      push(`${n.field} = $n`, v);
    }
  }
  if (linkedMaterialId !== undefined) {
    push("linked_material_id = $n", linkedMaterialId);
  }
  if (body.linked_board_item_id !== undefined) {
    const v = body.linked_board_item_id == null ? null : String(body.linked_board_item_id);
    push("linked_board_item_id = $n", v);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  args.push(id);
  await withPgTx(async (client) => {
    await client.query(
      `UPDATE boq_items SET ${sets.join(", ")} WHERE id = $${args.length}`,
      args
    );
    // Recompute the item amount from the fresh row.
    const row = await client.query(
      `SELECT qty, material_rate, labour_rate, wastage_pct, gst_pct
       FROM boq_items WHERE id = $1 LIMIT 1`,
      [id]
    );
    const it = row.rows[0] as Record<string, unknown> | undefined;
    if (it) {
      const amount = calcItemAmount(
        Number(it.qty ?? 1),
        Number(it.material_rate ?? 0),
        Number(it.labour_rate ?? 0),
        Number(it.wastage_pct ?? 5),
        Number(it.gst_pct ?? 18)
      );
      await client.query(`UPDATE boq_items SET amount = $1 WHERE id = $2`, [amount, id]);
    }
    await client.query(
      `UPDATE boq_versions SET total = (
         SELECT COALESCE(SUM(amount), 0) FROM boq_items WHERE boq_version_id = $1
       ), updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [versionId, versionId]
    );
  });

  const row = await pgOne<Record<string, unknown>>(
    `${BOQ_ITEM_SELECT} WHERE bi.id = $1 LIMIT 1`,
    [id]
  );
  return NextResponse.json({ item: row ? mapBoqItem(row) : null });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const { id } = await params;

  await ensureMigrated();
  const versionId = await itemVersionId(id);
  if (!versionId) return NextResponse.json({ error: "not found" }, { status: 404 });
  const version = await pgOne<{ tenant_id: number }>(
    `SELECT tenant_id FROM boq_versions WHERE id = $1 LIMIT 1`,
    [versionId]
  );
  if (!version || version.tenant_id !== tenantId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await pgMany(`DELETE FROM boq_items WHERE id = $1`, [id]);
  await recalcVersion(versionId);
  return NextResponse.json({ ok: true });
}
