import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { resolveAdminTenantId } from "@/lib/theme";
import { ensureMigrated, pgMany, pgOne, withPgTx } from "@/lib/pg";
import { mapBoard, mapBoardItem, materialFromItemRow } from "@/lib/boards";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

type ItemPayload = {
  id?: string;
  material_id?: string | null;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rotation?: number;
  z_index?: number;
  meta_json?: Record<string, unknown>;
};

/**
 * POST /api/boards/[id]/save
 *   Full-replace save of a board's canvas state. The frontend
 *   debounces this at 800ms after any drag/resize/note/zoom change.
 *   Payload: { canvas_json?, items: ItemPayload[] } - items are
 *   upserted by id (new ids are created), and any item NOT in the
 *   payload is deleted (full replace mode).
 */
export async function POST(req: NextRequest, { params }: Params) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenantId = await resolveAdminTenantId();
  const { id } = await params;

  let body: { canvas_json?: unknown; items?: ItemPayload[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const items = Array.isArray(body.items) ? body.items : [];

  await ensureMigrated();
  const board = await pgOne<{ tenant_id: number }>(
    `SELECT tenant_id FROM boards WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!board) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (board.tenant_id !== tenantId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const out = await withPgTx(async (client) => {
    if (body.canvas_json !== undefined) {
      const canvasStr =
        typeof body.canvas_json === "string"
          ? body.canvas_json
          : JSON.stringify(body.canvas_json);
      await client.query(
        `UPDATE boards SET canvas_json = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [canvasStr, id]
      );
    }

    // Full replace: keep the payload's ids, delete the rest.
    const keepIds = items
      .map((it) => (typeof it.id === "string" && it.id ? it.id : null))
      .filter((v): v is string => v !== null);
    if (keepIds.length > 0) {
      // Build a dynamic IN list with distinct params. Placeholders
      // must ascend in appearance order: the SQLite shim binds `?`
      // left-to-right against the args array, so board_id = $1 comes
      // first.
      const ph = keepIds.map((_, i) => `$${i + 2}`).join(", ");
      await client.query(
        `DELETE FROM board_items WHERE board_id = $1
         AND id NOT IN (${ph})`,
        [id, ...keepIds]
      );
    } else {
      await client.query(`DELETE FROM board_items WHERE board_id = $1`, [id]);
    }

    for (const it of items) {
      const itemId =
        typeof it.id === "string" && it.id
          ? it.id
          : (crypto.randomUUID() as string);
      const meta = it.meta_json ?? {};
      const z = Number(it.z_index ?? 0);
      const existing = await client.query(
        `SELECT id FROM board_items WHERE id = $1 LIMIT 1`,
        [itemId]
      );
      // Placeholders must appear in ascending $N order: the SQLite shim
      // binds `?` left-to-right against the args array, so `$1, $10, $2`
      // would misalign on the fallback runtime.
      // Placeholders ascend in appearance order: the SQLite shim
      // binds `?` left-to-right against the args array.
      const geometry: unknown[] = [
        it.material_id ?? null,
        Number(it.x ?? 0),
        Number(it.y ?? 0),
        Number(it.w ?? 200),
        Number(it.h ?? 200),
        Number(it.rotation ?? 0),
        z,
        JSON.stringify(meta),
      ];
      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE board_items SET
             material_id = $1, x = $2, y = $3, w = $4, h = $5,
             rotation = $6, z_index = $7, meta_json = $8
           WHERE id = $9 AND board_id = $10`,
          [...geometry, itemId, id]
        );
      } else {
        await client.query(
          `INSERT INTO board_items
             (id, board_id, material_id, x, y, w, h, rotation, z_index, meta_json)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [itemId, id, ...geometry]
        );
      }
    }

    await client.query(
      `UPDATE boards SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
  });

  const row = await pgOne<Record<string, unknown>>(
    `SELECT * FROM boards WHERE id = $1 LIMIT 1`,
    [id]
  );
  const itemRows = await pgManyJoined(id);
  return NextResponse.json({
    board: row
      ? {
          ...mapBoard(row),
          items: itemRows.map((r) => mapBoardItem(r, materialFromItemRow(r))),
        }
      : null,
  });
}

// Read runs outside the tx on the connection pool, matching the
// other routes.
async function pgManyJoined(boardId: string) {
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
