import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { resolveAdminTenantId } from "@/lib/theme";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import { mapBoardItem, materialFromItemRow } from "@/lib/boards";

export const dynamic = "force-dynamic";

/**
 * POST /api/board-items {board_id, material_id, x, y, w?, h?}
 *   Adds a single item to a board. Tenant checked through the board.
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenantId = await resolveAdminTenantId();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const boardId = String(body.board_id ?? "").trim();
  const materialId = String(body.material_id ?? "").trim();
  if (!boardId || !materialId) {
    return NextResponse.json({ error: "board_id and material_id are required" }, { status: 400 });
  }
  const x = Number(body.x ?? 0);
  const y = Number(body.y ?? 0);
  const w = Number(body.w ?? 200);
  const h = Number(body.h ?? 200);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return NextResponse.json({ error: "invalid coordinates" }, { status: 400 });
  }

  await ensureMigrated();
  const board = await pgOne<{ tenant_id: number }>(
    `SELECT tenant_id FROM boards WHERE id = $1 LIMIT 1`,
    [boardId]
  );
  if (!board) return NextResponse.json({ error: "board not found" }, { status: 404 });
  if (board.tenant_id !== tenantId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Material must exist and belong to the same tenant (or be null-safe
  // for future non-material items).
  const material = await pgOne<Record<string, unknown>>(
    `SELECT id, tenant_id, name, image_url, cost_per_unit, unit, category
     FROM materials WHERE id = $1 LIMIT 1`,
    [materialId]
  );
  if (!material) return NextResponse.json({ error: "material not found" }, { status: 404 });
  if (Number(material.tenant_id) !== tenantId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const id = crypto.randomUUID();
  await pgMany(
    `INSERT INTO board_items (id, board_id, material_id, x, y, w, h)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, boardId, materialId, x, y, w, h]
  );
  const row = await pgOne<Record<string, unknown>>(
    `SELECT * FROM board_items WHERE id = $1 LIMIT 1`,
    [id]
  );
  const item = row
    ? mapBoardItem(row, {
        id: String(material.id),
        name: String(material.name),
        imageUrl: material.image_url == null ? null : String(material.image_url),
        costPerUnit: Number(material.cost_per_unit ?? 0),
        unit: String(material.unit ?? "nos"),
        category: String(material.category ?? "other"),
      })
    : null;
  return NextResponse.json({ item }, { status: 201 });
}
