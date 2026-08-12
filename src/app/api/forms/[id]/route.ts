import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, pgOne } from "@/lib/pg";
import { requireAdminSession } from "@/lib/license-gate";
import { normalizeSlug, validateFields, FormField } from "@/lib/forms";

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

function rowToDto(row: Record<string, unknown>) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    fields: parseFields(row.fields),
    submit_label: row.submit_label,
    success_message: row.success_message,
    is_published: row.is_published === 1 || row.is_published === true,
    created_at: row.created_at,
  };
}

type Ctx = { params: Promise<{ id: string }> };

async function getForm(id: number) {
  await ensureMigrated();
  return pgOne(
    `SELECT * FROM form_definitions WHERE id = $1 LIMIT 1`,
    [id]
  );
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const row = await getForm(Number(id));
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(rowToDto(row));
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const row = await getForm(Number(id));
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const d = await req.json();
    const slug = d.slug !== undefined ? normalizeSlug(d.slug) : row.slug;
    const title = d.title !== undefined ? String(d.title).trim().slice(0, 255) : row.title;
    if (!slug || !title) {
      return NextResponse.json(
        { error: "slug and title are required" },
        { status: 400 }
      );
    }
    const check = validateFields(d.fields !== undefined ? d.fields : parseFields(row.fields));
    if (!check.ok || !check.fields) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }
    const clash = await pgOne(
      `SELECT id FROM form_definitions WHERE slug = $1 AND id != $2 LIMIT 1`,
      [slug, Number(id)]
    );
    if (clash) {
      return NextResponse.json(
        { error: `A form with slug "${slug}" already exists.` },
        { status: 409 }
      );
    }
    const updated = await pgOne(
      `UPDATE form_definitions
       SET slug = $1, title = $2, fields = $3::jsonb,
           submit_label = $4, success_message = $5, is_published = $6
       WHERE id = $7
       RETURNING *`,
      [
        slug,
        title,
        JSON.stringify(check.fields),
        d.submit_label !== undefined
          ? String(d.submit_label).slice(0, 128) || null
          : row.submit_label,
        d.success_message !== undefined
          ? String(d.success_message).slice(0, 500) || null
          : row.success_message,
        d.is_published !== undefined ? Boolean(d.is_published) : Boolean(row.is_published),
        Number(id),
      ]
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
  const row = await getForm(Number(id));
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await ensureMigrated();
  // Cascade submissions with the definition.
  await pgOne(`DELETE FROM form_submissions WHERE form_id = $1`, [Number(id)]);
  await pgOne(`DELETE FROM form_definitions WHERE id = $1`, [Number(id)]);
  return NextResponse.json({ success: true });
}
