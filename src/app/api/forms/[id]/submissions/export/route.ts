import { NextResponse } from "next/server";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import { requireAdminSession } from "@/lib/license-gate";
import { FormField } from "@/lib/forms";

type Ctx = { params: Promise<{ id: string }> };

function parseFields(raw: unknown): FormField[] {
  if (Array.isArray(raw)) return raw as FormField[];
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? (p as FormField[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

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

function csvCell(v: string): string {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

export async function GET(_req: Request, ctx: Ctx) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  await ensureMigrated();
  const def = await pgOne(
    `SELECT * FROM form_definitions WHERE id = $1 LIMIT 1`,
    [Number(id)]
  );
  if (!def) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const fields = parseFields(def.fields);
  const rows = await pgMany(
    `SELECT id, payload, read_at, created_at
     FROM form_submissions
     WHERE form_id = $1
     ORDER BY id ASC`,
    [Number(id)]
  );

  const header = [
    "id",
    "submitted_at",
    "read",
    ...fields.map((f) => f.key),
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    const payload = parsePayload(r.payload);
    const cells = [
      String(r.id),
      r.created_at ? String(r.created_at) : "",
      r.read_at ? "yes" : "no",
      ...fields.map((f) => payload[f.key] ?? ""),
    ];
    lines.push(cells.map(csvCell).join(","));
  }
  const csv = lines.join("\r\n");
  const slug = String(def.slug || `form-${id}`).replace(/[^a-z0-9_-]/gi, "");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-submissions.csv"`,
    },
  });
}
