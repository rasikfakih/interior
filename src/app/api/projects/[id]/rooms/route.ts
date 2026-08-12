import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import { requireAdminSession } from "@/lib/license-gate";
import { parseHotspots, validateRoom, ProjectRoom } from "@/lib/rooms";

type Ctx = { params: Promise<{ id: string }> };

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

async function getProject(id: number) {
  await ensureMigrated();
  return pgOne(`SELECT id FROM projects WHERE id = $1 LIMIT 1`, [id]);
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await ensureMigrated();
  const project = await getProject(Number(id));
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const rows = await pgMany(
    `SELECT * FROM project_rooms
     WHERE project_id = $1
     ORDER BY order_index ASC, id ASC`,
    [Number(id)]
  );
  return NextResponse.json(rows.map(rowToDto));
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  await ensureMigrated();
  const project = await getProject(Number(id));
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  try {
    const d = await req.json();
    const check = validateRoom(d ?? {});
    if (!check.ok || !check.room) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }
    const clash = await pgOne(
      `SELECT id FROM project_rooms
       WHERE project_id = $1 AND slug = $2 LIMIT 1`,
      [Number(id), check.room.slug]
    );
    if (clash) {
      return NextResponse.json(
        { error: `A room with slug "${check.room.slug}" already exists.` },
        { status: 409 }
      );
    }
    const maxOrder = await pgOne<{ m: number }>(
      `SELECT COALESCE(MAX(order_index), -1) AS m FROM project_rooms WHERE project_id = $1`,
      [Number(id)]
    );
    const order = d.order_index !== undefined
      ? Number(d.order_index) || 0
      : (maxOrder?.m ?? -1) + 1;
    const inserted = await pgOne(
      `INSERT INTO project_rooms
         (project_id, name, slug, description, model_3d,
          cover_media_id, hotspots, order_index, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
       RETURNING *`,
      [
        Number(id),
        check.room.name,
        check.room.slug,
        check.room.description,
        check.room.model_3d,
        check.room.cover_media_id,
        check.room.hotspots ? JSON.stringify(check.room.hotspots) : null,
        order,
        check.room.is_published,
      ]
    );
    if (!inserted) {
      return NextResponse.json({ error: "Insert failed" }, { status: 400 });
    }
    return NextResponse.json(
      { success: true, item: rowToDto(inserted) },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Create failed" }, { status: 400 });
  }
}
