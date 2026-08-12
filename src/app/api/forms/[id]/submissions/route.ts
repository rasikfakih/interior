import { NextResponse } from "next/server";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import { requireAdminSession } from "@/lib/license-gate";

type Ctx = { params: Promise<{ id: string }> };

function parsePayload(raw: unknown): Record<string, string> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, string>;
  }
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      if (p && typeof p === "object" && !Array.isArray(p)) {
        return p as Record<string, string>;
      }
    } catch {
      /* fall through */
    }
  }
  return {};
}

export async function GET(_req: Request, ctx: Ctx) {
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
  const rows = await pgMany<{
    id: number;
    payload: unknown;
    read_at: string | null;
    created_at: string | null;
  }>(
    `SELECT id, payload, read_at, created_at
     FROM form_submissions
     WHERE form_id = $1
     ORDER BY id DESC`,
    [Number(id)]
  );
  const submissions = rows.map((r) => ({
    id: r.id,
    payload: parsePayload(r.payload),
    read_at: r.read_at,
    created_at: r.created_at,
  }));
  const unread = submissions.filter((s) => !s.read_at).length;
  return NextResponse.json({ submissions, unread });
}
