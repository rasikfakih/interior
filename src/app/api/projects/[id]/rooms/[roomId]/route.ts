import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, pgOne } from "@/lib/pg";
import { requireAdminSession } from "@/lib/license-gate";
import { parseHotspots, validateRoom, ProjectRoom } from "@/lib/rooms";

type Ctx = { params: Promise<{ id: string; roomId: string }> };

function rowToDto(row: Record<string, unknown>): ProjectRoom {
  return {
    id: Number(row.id),
    project_id: Number(row.project_id),
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    description: row.description ? String(row.description) : null,
    model_3d: row.model_3d ? String(row.model_3d) : null,
    cover_media_id:
      row.cover_media_id !== null && row.cover_media_id !== undefined
        ? Number(row.cover_media_id)
        : null,
    hotspots: parseHotspots(row.hotspots),
    order_index: Number(row.order_index ?? 0),
    is_published: row.is_published === 1 || row.is_published === true,
  };
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  const { id, roomId } = await ctx.params;
  await ensureMigrated();
  const row = await pgOne(
    `SELECT * FROM project_rooms WHERE id = $1 AND project_id = $2 LIMIT 1`,
    [Number(roomId), Number(id)]
  );
  if (!row) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  try {
    const d = await req.json();
    const check = validateRoom(d ?? {});
    if (!check.ok || !check.room) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }
    const clash = await pgOne(
      `SELECT id FROM project_rooms
       WHERE project_id = $1 AND slug = $2 AND id != $3 LIMIT 1`,
      [Number(id), check.room.slug, Number(roomId)]
    );
    if (clash) {
      return NextResponse.json(
        { error: `A room with slug "${check.room.slug}" already exists.` },
        { status: 409 }
      );
    }
    const updated = await pgOne(
      `UPDATE project_rooms
       SET name = $1, slug = $2, description = $3, model_3d = $4,
           cover_media_id = $5, hotspots = $6::jsonb,
           order_index = $7, is_published = $8
       WHERE id = $9 AND project_id = $10
       RETURNING *`,
      [
        check.room.name,
        check.room.slug,
        check.room.description,
        check.room.model_3d,
        check.room.cover_media_id,
        check.room.hotspots ? JSON.stringify(check.room.hotspots) : null,
        check.room.order_index,
        check.room.is_published,
        Number(roomId),
        Number(id),
      ]
    );
    if (!updated) {
      return NextResponse.json({ error: "Update failed" }, { status: 400 });
    }
    return NextResponse.json({ success: true, item: rowToDto(updated) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Update failed" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  const { id, roomId } = await ctx.params;
  await ensureMigrated();
  const row = await pgOne(
    `SELECT id FROM project_rooms WHERE id = $1 AND project_id = $2 LIMIT 1`,
    [Number(roomId), Number(id)]
  );
  if (!row) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  await pgOne(
    `DELETE FROM project_rooms WHERE id = $1 AND project_id = $2`,
    [Number(roomId), Number(id)]
  );
  return NextResponse.json({ success: true });
}
