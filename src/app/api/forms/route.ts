import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import { requireAdminSession } from "@/lib/license-gate";
import {
  FormField,
  normalizeSlug,
  validateFields,
} from "@/lib/forms";

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
    submission_count: Number(row.submission_count ?? 0),
  };
}

export async function GET() {
  await ensureMigrated();
  const rows = await pgMany(
    `SELECT f.*,
            (SELECT COUNT(*) FROM form_submissions s WHERE s.form_id = f.id) AS submission_count
     FROM form_definitions f
     ORDER BY f.id ASC`
  );
  return NextResponse.json(rows.map(rowToDto));
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  try {
    const d = await req.json();
    const slug = normalizeSlug(d.slug || d.title || "");
    if (!slug) {
      return NextResponse.json(
        { error: "A slug (or title to derive one) is required." },
        { status: 400 }
      );
    }
    const title = String(d.title ?? "").trim().slice(0, 255);
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const check = validateFields(d.fields);
    if (!check.ok || !check.fields) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }
    await ensureMigrated();
    const existing = await pgOne(
      `SELECT id FROM form_definitions WHERE slug = $1 LIMIT 1`,
      [slug]
    );
    if (existing) {
      return NextResponse.json(
        { error: `A form with slug "${slug}" already exists.` },
        { status: 409 }
      );
    }
    const inserted = await pgOne(
      `INSERT INTO form_definitions
         (slug, title, fields, submit_label, success_message, is_published)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6)
       RETURNING *`,
      [
        slug,
        title,
        JSON.stringify(check.fields),
        d.submit_label ? String(d.submit_label).slice(0, 128) : null,
        d.success_message ? String(d.success_message).slice(0, 500) : null,
        d.is_published !== false,
      ]
    );
    if (!inserted) {
      return NextResponse.json({ error: "Insert failed" }, { status: 400 });
    }
    return NextResponse.json({ success: true, item: rowToDto(inserted) }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: msg || "Create failed" },
      { status: 400 }
    );
  }
}
