import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { resolveAdminTenantId } from "@/lib/theme";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import { mapBoardItem, materialFromItemRow } from "@/lib/boards";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function loadItem(itemId: string) {
  return pgOne<Record<string, unknown>>(
    `SELECT bi.*,
            m.id AS m_id, m.name AS m_name, m.image_url AS m_image_url,
            m.cost_per_unit AS m_cost_per_unit, m.unit AS m_unit,
            m.category AS m_category
     FROM board_items bi
     LEFT JOIN materials m ON m.id = bi.material_id
     WHERE bi.id = $1 LIMIT 1`,
    [itemId]
  );
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenantId = await resolveAdminTenantId();
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  await ensureMigrated();
  const item = await pgOne<{ board_id: string }>(
    `SELECT board_id FROM board_items WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

  const board = await pgOne<{ tenant_id: number }>(
    `SELECT tenant_id FROM boards WHERE id = $1 LIMIT 1`,
    [item.board_id]
  );
  if (!board || board.tenant_id !== tenantId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sets: string[] = [];
  const args: unknown[] = [];
  const push = (sql: string, value: unknown) => {
    args.push(value);
    sets.push(sql.replace("$n", `$${args.length}`));
  };

  if (body.x !== undefined) {
    const v = Number(body.x);
    if (!Number.isFinite(v)) return NextResponse.json({ error: "invalid x" }, { status: 400 });
    push("x = $n", v);
  }
  if (body.y !== undefined) {
    const v = Number(body.y);
    if (!Number.isFinite(v)) return NextResponse.json({ error: "invalid y" }, { status: 400 });
    push("y = $n", v);
  }
  if (body.w !== undefined) {
    const v = Number(body.w);
    if (!Number.isFinite(v)) return NextResponse.json({ error: "invalid w" }, { status: 400 });
    push("w = $n", v);
  }
  if (body.h !== undefined) {
    const v = Number(body.h);
    if (!Number.isFinite(v)) return NextResponse.json({ error: "invalid h" }, { status: 400 });
    push("h = $n", v);
  }
  if (body.rotation !== undefined) {
    const v = Number(body.rotation);
    if (!Number.isFinite(v)) return NextResponse.json({ error: "invalid rotation" }, { status: 400 });
    push("rotation = $n", v);
  }
  if (body.z_index !== undefined) {
    const v = Math.round(Number(body.z_index));
    if (!Number.isFinite(v)) return NextResponse.json({ error: "invalid z_index" }, { status: 400 });
    push("z_index = $n", v);
  }
  if (body.meta_json !== undefined) {
    const meta =
      typeof body.meta_json === "string" ? body.meta_json : JSON.stringify(body.meta_json);
    push("meta_json = $n", meta);
  }
  if (sets.length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  args.push(id);
  await pgMany(
    `UPDATE board_items SET ${sets.join(", ")} WHERE id = $${args.length}`,
    args
  );

  const row = await loadItem(id);
  const dto = row ? mapBoardItem(row, materialFromItemRow(row)) : null;
  return NextResponse.json({ item: dto });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenantId = await resolveAdminTenantId();
  const { id } = await params;

  await ensureMigrated();
  const item = await pgOne<{ board_id: string }>(
    `SELECT board_id FROM board_items WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

  const board = await pgOne<{ tenant_id: number }>(
    `SELECT tenant_id FROM boards WHERE id = $1 LIMIT 1`,
    [item.board_id]
  );
  if (!board || board.tenant_id !== tenantId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await pgMany(`DELETE FROM board_items WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
