import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, pgOne } from "@/lib/pg";
import { requireAdminSession } from "@/lib/license-gate";
import { normalizeSource, normalizeDestination } from "@/app/api/redirects/route";

type Ctx = { params: Promise<{ id: string }> };

function rowToDto(row: Record<string, unknown>) {
  return {
    id: row.id,
    source: row.source,
    destination: row.destination,
    status_code: Number(row.status_code ?? 301),
    is_active: row.is_active === 1 || row.is_active === true,
  };
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  await ensureMigrated();
  const row = await pgOne(
    `SELECT * FROM redirects WHERE id = $1 LIMIT 1`,
    [Number(id)]
  );
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const d = await req.json();
    const source = normalizeSource(d.source !== undefined ? d.source : row.source);
    const destination = normalizeDestination(
      d.destination !== undefined ? d.destination : row.destination
    );
    if (source === "/") {
      return NextResponse.json({ error: "The site root cannot be redirected." }, { status: 400 });
    }
    if (!destination) {
      return NextResponse.json({ error: "destination is required" }, { status: 400 });
    }
    const clash = await pgOne(
      `SELECT id FROM redirects WHERE source = $1 AND id != $2 LIMIT 1`,
      [source, Number(id)]
    );
    if (clash) {
      return NextResponse.json(
        { error: `A redirect for "${source}" already exists.` },
        { status: 409 }
      );
    }
    const status = d.status_code === 302 ? 302 : d.status_code === 308 ? 308 : 301;
    const updated = await pgOne(
      `UPDATE redirects
       SET source = $1, destination = $2, status_code = $3,
           is_active = $4
       WHERE id = $5
       RETURNING *`,
      [source, destination, status, d.is_active !== undefined ? Boolean(d.is_active) : Boolean(row.is_active), Number(id)]
    );
    if (!updated) {
      return NextResponse.json({ error: "Update failed" }, { status: 400 });
    }
    return NextResponse.json({ success: true, item: rowToDto(updated) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: msg || "Update failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  await ensureMigrated();
  const row = await pgOne(
    `SELECT id FROM redirects WHERE id = $1 LIMIT 1`,
    [Number(id)]
  );
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await pgOne(`DELETE FROM redirects WHERE id = $1`, [Number(id)]);
  return NextResponse.json({ success: true });
}
