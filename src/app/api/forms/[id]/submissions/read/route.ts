import { NextResponse } from "next/server";
import { ensureMigrated, pgOne } from "@/lib/pg";
import { requireAdminSession } from "@/lib/license-gate";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  await ensureMigrated();
  const def = await pgOne(
    `SELECT id FROM form_definitions WHERE id = $1 LIMIT 1`,
    [Number(id)]
  );
  if (!def) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await pgOne(
    `UPDATE form_submissions
     SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE form_id = $1 AND read_at IS NULL`,
    [Number(id)]
  );
  return NextResponse.json({ success: true });
}
