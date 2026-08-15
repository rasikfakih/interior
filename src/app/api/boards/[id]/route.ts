import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { resolveAdminTenantId } from "@/lib/theme";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import {
  mapBoard,
  mapBoardItem,
  materialFromItemRow,
  normalizeBoardStatus,
  type BoardDto,
} from "@/lib/boards";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Load a board's items with the material joined (aliased m_*). */
async function loadItems(boardId: string) {
  return pgMany<Record<string, unknown>>(
    `SELECT bi.*,
            m.id AS m_id, m.name AS m_name, m.image_url AS m_image_url,
            m.cost_per_unit AS m_cost_per_unit, m.unit AS m_unit,
            m.category AS m_category
     FROM board_items bi
     LEFT JOIN materials m ON m.id = bi.material_id
     WHERE bi.board_id = $1
     ORDER BY bi.z_index ASC, bi.created_at ASC`,
    [boardId]
  );
}

export async function GET(_req: NextRequest, { params }: Params) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenantId = await resolveAdminTenantId();
  const { id } = await params;

  await ensureMigrated();
  const board = await pgOne<Record<string, unknown>>(
    `SELECT * FROM boards WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!board) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (Number(board.tenant_id) !== tenantId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const itemRows = await loadItems(id);
  const items = itemRows.map((r) =>
    mapBoardItem(r, materialFromItemRow(r))
  );
  const dto: BoardDto = { ...mapBoard(board), items };
  return NextResponse.json({ board: dto });
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
  const board = await pgOne<{ tenant_id: number }>(
    `SELECT tenant_id FROM boards WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!board) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (board.tenant_id !== tenantId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sets: string[] = [];
  const args: unknown[] = [];
  const push = (sql: string, value: unknown) => {
    args.push(value);
    sets.push(sql.replace("$n", `$${args.length}`));
  };

  if (body.title !== undefined) {
    push("title = $n", String(body.title).trim() || "Moodboard");
  }
  if (body.status !== undefined) {
    const status = normalizeBoardStatus(body.status);
    if (!status) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    push("status = $n", status);
  }
  if (body.canvas_json !== undefined) {
    let canvasStr: string;
    if (typeof body.canvas_json === "string") {
      canvasStr = body.canvas_json;
    } else {
      canvasStr = JSON.stringify(body.canvas_json);
    }
    push("canvas_json = $n", canvasStr);
  }
  if (sets.length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  args.push(id);
  await pgMany(
    `UPDATE boards SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${args.length}`,
    args
  );

  const row = await pgOne<Record<string, unknown>>(
    `SELECT * FROM boards WHERE id = $1 LIMIT 1`,
    [id]
  );
  const itemRows = await loadItems(id);
  const dto: BoardDto | null = row
    ? { ...mapBoard(row), items: itemRows.map((r) => mapBoardItem(r, materialFromItemRow(r))) }
    : null;
  return NextResponse.json({ board: dto });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenantId = await resolveAdminTenantId();
  const { id } = await params;

  await ensureMigrated();
  const board = await pgOne<{ tenant_id: number }>(
    `SELECT tenant_id FROM boards WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!board) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (board.tenant_id !== tenantId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // FK cascade removes board_items on both runtimes.
  await pgMany(`DELETE FROM boards WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
